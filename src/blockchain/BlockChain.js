const Debug = require('debug')('blockjs:BlockChain')
const https = require('https')
const fs = require('fs')

const Message = require('./message.js')
const Block = require('./block.js')
const { Cst, CstError, CstTxt } = require('../Const.js')
const DB = require('./db.js')
const P2P = require('./p2p.js')
const API = require('../api/express.js')
const Genesis = require('./genesis.js')
const Mining = require('./mining.js')
const Address = require('./address.js')


const { Db: { Docs: CstDocs }, API: CstAPI } = Cst


class BlockChain {
  /* start BlockChain :
  - connect to Db
  - add genesis block if it doesn't exist
  - start p2p server
  - start api server
  */
  static async Start(
    serverPort = Cst.P2P.DefaultServerPort,
    DbServer = Cst.Db.DefaultServerIP,
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
    await Genesis.ExistInDb(blockchain)

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
    Debug(CstTxt.Stopped)
    process.exit()
  }

  constructor(Db, address, version = 1) {
    this.Db = Db
    this.Version = version
    this.Address = address
    this.P2P = null // p2p started when local blockchain is loaded or created
    this.NeededHashes = []
    this.API = API(this)
    this.Mining = false

    this.SSL_OPTIONS = {
      key: fs.readFileSync('./src/keys/ssl.key'),
      cert: fs.readFileSync('./src/keys/ssl.crt'),
      // ca: fs.readFileSync('./keys/intermediate.crt'),
    }
  }

  // get info text with Height, Diff, hash, amount pending messages
  async GetInfo() {
    const height = await this.GetHeight()
    const diff = await this.GetDiff()
    const hash = await this.GetBestHash()
    const amountPending = await this.GetAmountOfPendingMsgs()
    const mining = this.GetMining()

    const infoText = `${CstTxt.Address}: ${this.Address}
          ${CstTxt.Height}: ${height}
          ${CstTxt.Diff}: ${diff}
          ${CstTxt.LastHash}: ${hash}
          ${CstTxt.Pending}: ${amountPending}
          ${CstTxt.Mining}: ${mining}`
    return Promise.resolve(infoText)
  }


  // max height of blockchain
  GetHeight() {
    return new Promise((resolve, reject) => {
      this.Db.FindMax(CstDocs.Blockchain, 'Height')
        .catch(err => reject(err))
        .then(BlockWithMaxHeight => resolve(BlockWithMaxHeight.Height))
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
        .then(foundBlocksAtHeight => Block.ParseFromDb(foundBlocksAtHeight[0]))
        .then(block => resolve(block))
    })
  }

  // get block at specific height
  GetBlockAtHeight(atHeight) {
    return new Promise((resolve, reject) => {
      this.Db.Find(CstDocs.Blockchain, { Height: atHeight })
        .catch(err => reject(err))
        .then((foundBlock) => {
          if (foundBlock.length > 1) return reject(new Error(`${CstError.MultiBlocks} ${CstError.SameHeigh} ${atHeight}`))
          if (foundBlock.length === 0) return resolve(null)
          Debug(`Loaded block with hash ${foundBlock[0].Hash} for height ${atHeight}`)
          const block = Block.ParseFromDb(foundBlock[0])
          return resolve(block)
        })
    })
  }

  // get block with specific block hash
  GetBlockWithHash(blockhash) {
    return new Promise((resolve, reject) => {
      this.Db.Find(CstDocs.Blockchain, { Hash: blockhash })
        .catch(err => reject(err))
        .then((foundBlock) => {
          if (foundBlock.length > 1) return reject(new Error(`${CstError.MultiBlocks} ${CstError.SameHash}: ${blockhash} `))
          if (foundBlock.length === 0) return resolve(null)
          const block = Block.ParseFromDb(foundBlock[0])
          return resolve(block)
        })
    })
  }

  // get all hashes between best hash and specified hash
  async GetHashesFromBestTo(toHash) {
    const betweenHashes = []
    let getHash = await this.GetBestHash()
    if (!getHash) {
      Debug(`${CstError.CannotGetBestHash}`)
      return null
    }

    while (getHash !== toHash) {
      const prevBlock = await this.GetBlockWithHash(getHash) // eslint-disable-line no-await-in-loop
      if (!prevBlock) {
        Debug(`${CstError.CannotFindBlockForHash} : ${getHash}`)
        break
      }
      // add hash to between array
      betweenHashes.push(prevBlock.Blockhash())
      getHash = prevBlock.PrevHash
    }
    return betweenHashes
  }

  // promise of create Message
  CreateMsg(content, Id) {
    return Message.Create(this.Address, content, Id)
  }

  // add a message to the pending Messages
  async SendMsg(message) {
    // copy message because db save will mutated it (add _id)
    const msg = Message.ParseFromDb(message)
    // is msg a Message object ?
    if (msg instanceof Message === false) { return (new Error(CstError.SendNotMsg)) }
    // is the Message object not empty ?
    if (Object.keys(msg).length === 0) { return (new Error(CstError.SendNoContent)) }
    // is the Message complete ?
    const valid = await Message.IsValid(msg)
    if (!valid) { return (new Error(CstError.SendNoValid)) }

    // add message to pending pool
    await msg.Save(this.Db)
    // broadcast new pending message to peers
    this.P2P.Broadcast(Cst.P2P.MESSAGE, message)
    return true
  }

  // find a message in the blockchain, return Block
  // default search from own address
  async FindMsg(Content, FromAddress = this.Address, Id = null) {
    // create Message to get the message hash
    const msg = Message.Create(FromAddress, Content, Id)
    const filter = { 'Messages.Hash': msg.Hash }
    // find Block that contains the message hash
    const foundBlock = await this.Db.FindOne(CstDocs.Blockchain, filter)
    if (!foundBlock) return null
    // remove _id property by  deconstruct it out of foundBlock
    const { _id, ...BlockWithoutID } = foundBlock
    return BlockWithoutID
  }

  // default search from own address
  async FindMsgById(MsgId) {
    const filter = { 'Block.Messages.Id': MsgId }
    // find Block that contains the message hash
    const foundBlock = await this.Db.FindOne(CstDocs.Blockchain, filter)
    if (!foundBlock) return null
    // remove _id property by  deconstruct it out of foundBlock
    const { _id, ...BlockWithoutID } = foundBlock
    return BlockWithoutID
  }

  // return all pending messages in json format
  async GetAllPendingMgs() {
    const pendingDbMsgs = await this.Db.Find(CstDocs.PendingMessages, {})
    // remove database _id property
    const pendingMsg = pendingDbMsgs.map(msg => Message.ParseFromDb(msg))
    return pendingMsg
  }

  // connect to a peer via ip:port
  ConnectPeer(remoteIP, remotePort = Cst.P2P.DefaultServerPort) {
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
          if (amountBlockNeedEvaluation > 0 || NeededHashes.length > 0) return resolve(true)
          return resolve(false)
        })
        .catch(err => reject(err))
    })
  }

  // Set of clear Mining flag
  SetMining(mining) {
    this.Mining = mining
  }

  // Get  currently mining flag
  GetMining() {
    return this.Mining
  }

  // create new block with all pending messages
  async MineBlock() {
    const newBlock = await Mining.MineBlock(this)
    return newBlock
  }

  async Verify() {
    try {
      const AllBlocks = await this.Db.Find(CstDocs.Blockchain, {})

      AllBlocks.forEach((block) => {
        const TestBlock = Block.ParseFromDb(block)
        const Valid = Block.IsValid(TestBlock)
        if (!Valid) {
          Debug(`${CstError.BlockInvalid} : ${block}`)
          return false
        }
        const Prev = TestBlock.CheckPrevHash(this)
        if (!Prev) {
          Debug(`${CstError.PreviousHashNotInBlockchain} : ${TestBlock.Blockhash()}`)
          return false
        }
      })
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }
}

module.exports = BlockChain
