const Message = require('./message.js')
const Block = require('./block.js')
const { Cst } = require('./const.js')
const DB = require('./db.js')
const P2P = require('./p2p.js')
const API = require('../api/express.js')
const Genesis = require('./genesis.js')
const Mining = require('./mining.js')
const Address = require('./address.js')

const https = require('https')
const fs = require('fs')
const Debug = require('debug')('blockjs:BlockChain')

const { Db: { Docs: CstDocs }, API: CstAPI } = Cst


class BlockChain {
  /* start BlockChain :
  - connect to Db
  - add genesis block if it doesn't exist
  - start p2p server
  - start api server
  */
  static async Start(
    serverPort = Cst.DefaultServerPort,
    DbServer = '127.0.0.1',
    DbPort = Cst.Db.DefaultPort,
    APIPort = CstAPI.DefaultPort,
  ) {
    const database = new DB()
    await database.Connect(DbServer, DbPort)

    // get own address
    const address = await Address(database)

    // make BlockChain
    const blockchain = new BlockChain(database, address)

    // check if genesis block exists
    await Genesis.BlockExistInDb(blockchain)

    // start P2P
    blockchain.P2P = new P2P(serverPort, blockchain, this.version)

    // start API server
    const secureServer = https.createServer(blockchain.SSL_OPTIONS, blockchain.API)
    secureServer.listen(APIPort, CstAPI.IP, () => {
      Debug(`API server listening on https:/${CstAPI.IP}:${APIPort}`)
    })
    return (blockchain)
  }
  /*
   End BlockChain :
   - close Db connection
   - stop peer 2 peer server
   */
  End() {
    this.Db.Close()
    this.P2P.Close()
  }
  constructor(Db, address, version = 1) {
    this.Db = Db
    this.Version = version
    this.Address = address
    this.P2P = null // p2p started when local blockchain is loaded or created
    this.NeededHashes = []
    this.API = API(this)

    this.SSL_OPTIONS = {
      key: fs.readFileSync('./src/keys/ssl.key'),
      cert: fs.readFileSync('./src/keys/ssl.crt'),
      // ca: fs.readFileSync('./keys/intermediate.crt'),
    }
  }

  // get info text with Height, Diff, hash, amount pending messages
  GetInfo() {
    return new Promise((resolve, reject) => {
      const info = {}
      this.GetHeight()
        .then((height) => {
          info.height = height
          return this.GetDiff()
        })
        .then((diff) => {
          info.diff = diff
          return this.GetBestHash()
        })
        .then((hash) => {
          info.hash = hash
          return this.GetAmountOfPendingMsgs()
        })
        .then((amount) => {
          info.amount = amount
        })
        .then(() => {
          const infoText = `Address: ${this.Address}
          Height: ${info.height}
          Diff: ${info.diff}
          Last hash: ${info.hash}
          Pending messages: ${info.amount}`
          return resolve(infoText)
        })
        .catch(err => reject(err))
    })
  }
  // max height of blockchain
  GetHeight() {
    return new Promise((resolve, reject) => {
      this.Db.FindMax(CstDocs.Blockchain, 'Height')
        .catch(err => reject(err))
        .then(linkWithMaxHeight =>
          resolve(linkWithMaxHeight.Height))
    })
  }
  // current diff = diff of last block
  GetDiff() {
    return new Promise((resolve, reject) => {
      this.GetLastBlock()
        .catch(err => reject(err))
        .then(lastBlock => resolve(lastBlock.Diff))
    })
  }
  // hash of last block
  GetBestHash() {
    return new Promise((resolve, reject) => {
      this.GetLastBlock()
        .catch(err => reject(err))
        .then((lastblockInDB) => {
          const lastBlock = Block.ParseFromDb(lastblockInDB)
          // Block hash function now available
          return resolve(lastBlock.Blockhash())
        })
    })
  }
  // get amount of pending messages
  GetAmountOfPendingMsgs() {
    return this.Db.CountDocs(CstDocs.PendingMessages)
  }
  // get last block
  GetLastBlock() {
    return new Promise((resolve, reject) => {
      this.GetHeight()
        .catch(err => reject(err))
        .then(maxHeight => this.Db.Find(CstDocs.Blockchain, { Height: maxHeight }))
        .then(foundLinks => Block.ParseFromDb(foundLinks[0].Block))
        .then(block => resolve(block))
    })
  }
  // get block at specific height
  GetBlockAtHeight(atHeight) {
    return new Promise((resolve, reject) => {
      this.Db.Find(CstDocs.Blockchain, { Height: atHeight })
        .catch(err => reject(err))
        .then((foundLink) => {
          if (foundLink.length > 1) return reject(new Error(`Multiple blocks found with height ${atHeight}`))
          if (foundLink.length === 0) return resolve(null)
          Debug(`Loaded block with hash ${foundLink[0].Hash} for height ${atHeight}`)
          const block = Block.ParseFromDb(foundLink[0].Block)
          return resolve(block)
        })
    })
  }
  // get block with specific block hash
  GetBlockWithHash(blockhash) {
    return new Promise((resolve, reject) => {
      this.Db.Find(CstDocs.Blockchain, { Hash: blockhash })
        .catch(err => reject(err))
        .then((foundLink) => {
          if (foundLink.length > 1) return reject(new Error(`Multiple blocks found with hash ${blockhash}`))
          if (foundLink.length === 0) return resolve(null)
          const block = Block.ParseFromDb(foundLink[0].Block)
          return resolve(block)
        })
    })
  }
  // get all hashes between best hash and specified hash
  async GetHashesFromBestTo(toHash) {
    const betweenHashes = []
    let getHash = await this.GetBestHash()

    while (getHash !== toHash) {
      const prevBlock = await this.GetBlockWithHash(getHash) // eslint-disable-line
      // add hash to between array
      betweenHashes.push(prevBlock.Blockhash())
      getHash = prevBlock.PrevHash
    }
    return betweenHashes
  }
  // promise of create Message
  CreateMsg(content) {
    return Message.CreateFromContent(this.Address, content)
  }
  // add a message to the pending Messages
  async SendMsg(message) {
    // copy message because db save will mutated it (add _id)
    const msg = Message.ParseFromDb(message)
    // is msg a Message object ?
    if (msg instanceof Message === false) { return (new Error('SendMsg: argument is not a message')) }
    // is the Message object not empty ?
    if (Object.keys(msg).length === 0) { return (new Error('SendMsg: Empty message supplied')) }
    // is the Message complete ?
    const valid = await Message.IsValid(msg)
    if (!valid) { return (new Error('SendMsg: message is not valid')) }

    // add message to pending pool
    await msg.Save(this.Db)
    // broadcast new pending message to peers
    this.P2P.Broadcast(Cst.P2P.MESSAGE, msg)
    return true
  }
  // find a message in the blockchain, return link
  async FindMsg(content, from) {
    // default search from own address
    const fromAddress = from || this.Address
    // create Message to get the message hash
    const msg = Message.CreateFromContent(fromAddress, content)
    const filter = { 'Block.Messages.Hash': msg.Hash }
    // find link that contains the message hash
    const foundLink = await this.Db.FindOne(CstDocs.Blockchain, filter)
    if (!foundLink) return null
    // remove _id property by  deconstruct it out of foundLink
    const { _id, ...linkWithoutID } = foundLink // eslint-disable-line
    return linkWithoutID
  }
  // create new block with all pending messages
  async MineBlock() {
    const newBlock = await Mining.MineBlock(this)
    return newBlock
  }
  // return all pending messages in json format
  async GetAllPendingMgs() {
    const pendingDbMsgs = await this.Db.Find(CstDocs.PendingMessages, {})
    // remove database _id property
    const pendingMsg = pendingDbMsgs.map(msg => Message.ParseFromDb(msg))
    return pendingMsg
  }

  // connect to a peer via ip:port
  ConnectPeer(remoteIP, remotePort = Cst.DefaultServerPort) {
    return this.P2P.Connect(remoteIP, remotePort)
  }
  // details of connected peers
  PeersDetail() {
    const details = {
      Incoming: this.P2P.IncomingDetails(),
      Outgoing: this.P2P.OutgoingDetails(),
    }
    return details
  }
  // amount of incoming and outgoing connections
  ConnectionCount() {
    return this.P2P.Amount()
  }
  UpdateNeededHashes(needed) {
    this.NeededHashes = needed
  }

  CheckSyncingNeeded() {
    const { NeededHashes } = this
    return new Promise((resolve, reject) => {
      this.Db.CountDocs(CstDocs.IncomingBlocks)
        .then((amountBlockNeedEvaluation) => {
          if (amountBlockNeedEvaluation > 0) return resolve(true)
          if (NeededHashes.length > 0) return resolve(true)
          return resolve(false)
        })
        .catch(err => reject(err))
    })
  }
}

module.exports = BlockChain
