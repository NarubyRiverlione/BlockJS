const Message = require('./message.js')
const Block = require('./block.js')
const Cst = require('./const.js')
const DB = require('./db.js')
const P2P = require('./p2p.js')
const API = require('../api/express.js')
const Genesis = require('./genesis.js')
const Mining = require('./mining.js')
const Address = require('./address.js')

const https = require('https')
const fs = require('fs')
const Debug = require('debug')('blockjs:coin')

const CstDocs = Cst.Db.Docs
const CstAPI = Cst.API

class Coin {
  /* start coin :
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

    // make coin
    const coin = new Coin(database, address)

    // check if genesis block exists
    await Genesis.BlockExistInDb(coin)

    // start P2P
    coin.P2P = new P2P(serverPort, coin, this.version)

    // start API server
    const secureServer = https.createServer(coin.SSL_OPTIONS, coin.API)
    secureServer.listen(APIPort, CstAPI.IP, () => {
      Debug(`API server listening on https:/${CstAPI.IP}:${APIPort}`)
    })
    return (coin)
  }
  /*
   End coin :
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
          const infoText = `Height: ${info.height}
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
        .catch(err =>
          reject(err))
        .then(maxHeight =>
          this.Db.Find(CstDocs.Blockchain, { Height: maxHeight }))
        .then(foundLinks =>
          Block.ParseFromDb(foundLinks[0].Block))
        .then(block =>
          resolve(block))
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
    return Message.Create(this.Address, content)
  }
  // add a message to the pending Messages
  async SendMsg(msg) {
    // is msg a Message object ?
    if (msg instanceof Message === false) { return (new Error('SendMsg: argument is not a message')) }
    // is the Message object not empty ?
    if (Object.keys(msg).length === 0) { return (new Error('SendMsg: Empty message supplied')) }
    // is the Message complete ?
    if (!Message.IsValid(msg)) { return (new Error('SendMsg: message is not valid')) }

    // add message to pending pool
    await msg.Save(this.Db)
    // broadcast new pending message to peers
    this.P2P.Broadcast(Cst.P2P.MESSAGE, msg)
    return msg
  }
  // create new block with all pending messages
  async MineBlock() {
    const newBlock = await Mining.MineBlock(this)
    return newBlock
  }
  // return all pending messages in json format
  GetAllPendingMgs() {
    return this.Db.Find(CstDocs.PendingMessages, {})
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

module.exports = Coin
