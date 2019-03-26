const Debug = require('debug')('blockjs:BlockChain')
const https = require('https')
const fs = require('fs')

const { CreateMessage, IsMessageValid, ParseMessageFromDb } = require('./message.js')
const { ParseBlockFromDb, IsValidBlock } = require('./block.js')
const { Cst, CstError, CstTxt } = require('../Const.js')
const DB = require('./db.js')
const P2P = require('./p2p.js')
const API = require('../api/express.js')
const Genesis = require('./genesis.js')
const Mine = require('./mining.js')
const Address = require('./address.js')


const { Db: { Docs: CstDocs }, API: CstAPI } = Cst

const CheckApiPass = (ApiPass) => {
  if (!ApiPass) {
    const APIpassword = Math.random().toString(36).slice(-8)
    console.log(`${CstTxt.APIpassword} ${APIpassword}`) // eslint-disable no-console
    Debug(`${CstTxt.APIpassword} ${APIpassword}`)
    return APIpassword
  }
  return ApiPass
}
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
    APIpassword,
  ) {
    const database = new DB()
    await database.Connect(DbServer, DbPort)

    // get own address
    const address = await Address(database)

    // if no api password is provided create a random one
    const ApiPass = CheckApiPass(APIpassword)

    // make BlockChain
    const blockchain = new BlockChain(database, address, ApiPass)

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

  constructor(Db, address, APIpass, version = 1) {
    this.Db = Db
    this.Version = version
    this.Address = address
    this.P2P = null // p2p started when local blockchain is loaded or created
    this.NeededHashes = new Set()
    this.API = API(this, APIpass)
    this.MiningBusy = false // currently mining a block
    this.MinerRunning = false // will start mining every Cst.MiningStartEveryMinutes

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


    const infoText = `${CstTxt.Address}: ${this.Address}
          ${CstTxt.Height}: ${height}
          ${CstTxt.Diff}: ${diff}
          ${CstTxt.LastHash}: ${hash}

          ${CstTxt.Pending}: ${amountPending}
          ${CstTxt.MinerRunning}: ${this.MinerRunning}
          ${CstTxt.Mining}: ${this.MiningBusy}

          ${CstTxt.Syncing}: ${this.Syncing()}`
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
  // TODO changing diff
  GetDiff() {
    // return Promise.resolve(4)
    return new Promise((resolve, reject) => {
      this.GetLastBlock()
        .catch(err => reject(err))
        .then(lastBlock => resolve(lastBlock.Diff))
    })
  }

  // hash of last block
  GetBestHash() {
    return new Promise(async (resolve, reject) => {
      try {
        // GetLastBlock will calculated and add the block hash
        const lastBlock = await this.GetLastBlock()
        if (!lastBlock) { return reject(new Error('ERROR cannot read or parse first block from db')) }
        const BestHash = lastBlock.Hash
        return resolve(BestHash)
      } catch (err) { return reject(err) }
    })
  }

  // get amount of pending messages
  GetAmountOfPendingMsgs() {
    return this.Db.CountDocs(CstDocs.PendingMessages)
  }

  // get last block from db and parse it
  GetLastBlock() {
    return new Promise(async (resolve, reject) => {
      try {
        const maxHeight = await this.GetHeight()
        const foundBlocksAtHeight = await this.Db.Find(CstDocs.Blockchain, { Height: maxHeight })
        const block = await ParseBlockFromDb(foundBlocksAtHeight[0])
        return resolve(block)
      } catch (err) { return reject(err) }
    })
  }

  // get block at specific height
  GetBlockAtHeight(atHeight) {
    return new Promise(async (resolve, reject) => {
      try {
        const foundBlock = await this.Db.Find(CstDocs.Blockchain, { Height: atHeight })
        if (foundBlock.length > 1) return reject(new Error(`${CstError.MultiBlocks} ${CstError.SameHeigh} ${atHeight}`))
        if (foundBlock.length === 0) return resolve(null)
        Debug(`Loaded block with hash ${foundBlock[0].Hash} for height ${atHeight}`)
        const block = await ParseBlockFromDb(foundBlock[0])
        return resolve(block)
      } catch (err) { return reject(err) }
    })
  }

  // get block with specific block hash
  GetBlockWithHash(blockhash) {
    return new Promise(async (resolve, reject) => {
      try {
        const foundBlock = await this.Db.Find(CstDocs.Blockchain, { Hash: blockhash })
        if (foundBlock.length > 1) return reject(new Error(`${CstError.MultiBlocks} ${CstError.SameHash}: ${blockhash} `))// eslint-disable-line max-len
        if (foundBlock.length === 0) return resolve(null)
        const block = await ParseBlockFromDb(foundBlock[0])
        return resolve(block)
      } catch (err) { return reject(err) }
    })
  }

  // get all hashes between best hash and specified hash
  async GetHashesFromBestTo(toHash) {
    const betweenHashes = []
    let BestHash = await this.GetBestHash()
    if (!BestHash) {
      Debug(`${CstError.CannotGetBestHash}`)
      return null
    }

    while (BestHash !== toHash) {
      const prevBlock = await this.GetBlockWithHash(BestHash) // eslint-disable-line no-await-in-loop
      if (!prevBlock) {
        Debug(`${CstError.CannotFindBlockForHash} : ${BestHash}`)
        break
      }
      // add hash to between array
      betweenHashes.push(prevBlock.Hash)
      BestHash = prevBlock.PrevHash
    }
    return betweenHashes
  }

  // add a message to the pending Messages
  async SendMsg(Content, Id) {
    try {
      const msg = await CreateMessage(this.Address, Content, Id)

      // // is msg a Message object ?
      // if (msg instanceof Message === false) { return (new Error(CstError.SendNotMsg)) }
      // // is the Message object not empty ?
      // if (Object.keys(msg).length === 0) { return (new Error(CstError.SendNoContent)) }

      // is the Message complete ?
      const valid = await IsMessageValid(msg)
      if (!valid) { return (new Error(CstError.SendNoValid)) }
      // add message to pending pool
      await msg.Save(this.Db)
      // broadcast new pending message to peers
      this.P2P.Broadcast(Cst.P2P.MESSAGE, msg)
      return msg
    } catch (err) { Debug(err.message); return null }
  }

  // find a message in the blockchain, return Block
  // default search from own address
  async FindMsg(Content, FromAddress = this.Address, Id = null) {
    // create Message to get the message hash
    const msg = await CreateMessage(FromAddress, Content, Id)
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
    const pendingMsg = pendingDbMsgs.map(msg => ParseMessageFromDb(msg))
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

  AddHashesToNeeded(hashes) {
    hashes.forEach(hash => this.NeededHashes.add(hash))
  }

  RemoveFromNeededHashes(hash) {
    this.NeededHashes.delete(hash)
  }

  Syncing() {
    return this.NeededHashes.size > 0
  }


  // Starts or stops the continues miner
  MinerSetStatus(mining) {
    if (mining && this.MinerRunning) {
      Debug('Miner is already running')
      return
    }
    this.MinerRunning = mining
    this.MiningBusy = mining
    if (mining) this.MinerLoop() // start Miner loop
  }

  // set clear the currently mining flag
  SetCurrentMining(mining) {
    this.MiningBusy = mining
  }

  // get currently mining flag
  GetCurrentMining() {
    return this.MiningBusy
  }

  // create new blocks with all pending messages as long Miner is running
  async MinerLoop() {
    const newBlock = await Mine.MineBlock(this)
    if (newBlock) { Debug(`${CstTxt.MiningFoundBlock} : ${newBlock.Height} = ${newBlock.Hash}`) }
    if (this.MinerRunning) {
      this.MiningBusy = true
      this.MinerLoop()
    }
  }

  // verify all block in the blockchain
  async Verify() {
    try {
      const AllBlocks = await this.Db.Find(CstDocs.Blockchain, {})
      const KnowHashes = new Set()
      let Ok = true
      AllBlocks.forEach(async (block) => {
        const TestBlock = await ParseBlockFromDb(block)
        if (!TestBlock) {
          Debug(`${CstError.BlockInvalid} : ${block}`)
          Ok = false
        }

        const Valid = await IsValidBlock(TestBlock)
        if (!Valid) {
          Debug(`${CstError.BlockInvalid} : ${block}`)
          Ok = false
        }

        const Prev = await TestBlock.CheckPrevHash(this)
        if (!Prev) {
          Debug(`${CstError.PreviousHashNotInBlockchain} : ${TestBlock.Hash}`)
          Ok = false
        }


        if (KnowHashes.has(TestBlock.PrevHash)) {
          Debug(`Invalid: multiple block have same previous hash ${TestBlock.PrevHash}, height : ${TestBlock.Height}`)
          Ok = false
        }
        KnowHashes.add(TestBlock.PrevHash)
      })
      return Ok
    } catch (error) {
      console.error(error)
      return false
    }
  }
}

module.exports = BlockChain
