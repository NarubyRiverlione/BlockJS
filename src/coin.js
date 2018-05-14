const Transaction = require('./transaction.js')
const Block = require('./block.js')
const Wallet = require('./wallet.js')
const ChainLink = require('./chainlink.js')
const Cst = require('./const.js')
const DB = require('./db.js')
const P2P = require('./p2p.js')

const Debug = require('debug')('blockjs:blockchain')

const CstDocs = Cst.Db.Docs

const CreateGenesisBlock = () => {
  const GenesisWallet = new Wallet(Cst.GenesisRewardWallet, Cst.GenesisAddress)
  // coinBase TX = true
  const GenesisTX = new Transaction(null, GenesisWallet, Cst.GenesisReward, true)
  return Block.Create(null, 0, Cst.StartDiff, [GenesisTX], Cst.GenesisTimestamp)
}
const GenesisBlockExistInDb = Db =>
  new Promise((resolve, reject) => {
    Db.Find(CstDocs.Blockchain, { Height: 0 })
      .catch(err => reject(err))
      .then(firstLink =>
        resolve(firstLink.length !== 0))
  })
const CreateFirstLink = () =>
  new Promise((resolve, reject) => {
    CreateGenesisBlock()
      .then(GenesisBlock => resolve(ChainLink.Create(GenesisBlock, 0)))
      .catch(err => reject(err))
  })
const CreateBlockchain = Db =>
  new Promise((resolve, reject) => {
    let FirstLink
    // no links in database = no genesis block (first run?)
    // create blockchain by adding genesis block
    CreateFirstLink()
      .then((link) => {
        FirstLink = link
        Debug('Save genesis in Db')
        return Db.Add(CstDocs.Blockchain, FirstLink)
      })
      .then(() => resolve(FirstLink))
      .catch(err => reject(new Error(`ERROR cannot create/save genesis block: ${err}`)))
  })


const ClearPendingTX = Db => Db.RemoveAllDocs(CstDocs.PendingTransactions)
const AllPendingTX = Db => Db.Find(CstDocs.PendingTransactions, {})

const RemoveIncomingBlock = (prevHash, db, resolveMsg) =>
  new Promise((resolve, reject) => {
    const filter = { PrevHash: prevHash }
    db.RemoveOne(CstDocs.IncomingBlocks, filter)
      .then(() => resolve(resolveMsg))
      .catch(err => reject(err))
  })

const CheckSyncingNeeded = (Db, NeededHashes) =>
  new Promise((resolve, reject) => {
    Db.CountDocs(CstDocs.IncomingBlocks)
      .then((amountBlockNeedEvaluation) => {
        if (amountBlockNeedEvaluation > 0) return resolve(true)
        if (NeededHashes.length === 0) return resolve(true)
        return resolve(false)
      })
      .catch(err => reject(err))
  })


class Coin {
  /* start coin :
  - connect to Db
  - load wallet from db
  - add genesis block if it doesn't exist
  - start peer 2 peer server
  */
  static async Start(serverPort = Cst.DefaultPort, DbPort = Cst.DbPort) {
    const database = new DB()
    await database.Connect(DbPort)

    // load wallet
    const wallet = await Wallet.Load(database)

    // make coin
    const coin = new Coin(database, wallet)

    // check if genesis block exists
    const GenesesExist = await GenesisBlockExistInDb(database)
    // create genesis if needed
    if (!GenesesExist) {
      Debug('No blockchain in Db, create blockchain by adding Genesis Block')
      const FirstLink = await CreateBlockchain(database)
      // save to ownTX is wallet = Genesis address
      if (coin.Wallet.Address === Cst.GenesisAddress) {
        const GenesisTxHash = FirstLink.Block.Transactions[0].Hash
        await Wallet.SaveOwnTX(GenesisTxHash, coin.Db)
        // set genesis wallet balance
        await coin.Wallet.CalcBalance(coin.Db)
      }
    } else { Debug('Found genesis block in Db') }

    // start P2P
    coin.p2p = new P2P(serverPort, coin, this.version)

    return (coin)
  }

  /*
   End coin :
   - close Db connection
   - stop peer 2 peer server
   */
  End() {
    this.Db.Close()
    this.p2p.Close()
  }
  constructor(Db, wallet, version = 1) {
    this.Db = Db
    this.Version = version
    this.BlockReward = Cst.StartBlockReward
    this.Wallet = wallet
    this.p2p = null // p2p started when local blockchain is loaded or created
    this.NeededHashes = []
  }
  get Balance() {
    return this.Wallet.Balance
  }
  // get info text with Height, Diff, hash, amount pending transactions
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
          return this.GetAmountOfPendingTX()
        })
        .then((amount) => {
          info.amount = amount
        })
        .then(() => {
          const infoText = `
          Height: ${info.height}
          Diff: ${info.diff}
          Last hash: ${info.hash}
          Amount of pending TX: ${info.amount}`
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
        .catch(err =>
          reject(err))
        .then(lastBlock =>
          resolve(lastBlock.Diff))
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
  // get amount of pending transactions
  GetAmountOfPendingTX() {
    return this.Db.CountDocs(CstDocs.Blockchain)
  }
  // get last block
  GetLastBlock() {
    return new Promise((resolve, reject) => {
      this.GetHeight()
        .catch(err =>
          reject(err))
        .then(maxHeigth =>
          this.Db.Find(CstDocs.Blockchain, { Height: maxHeigth }))
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
  GetPrevBlock(block) {
    return this.GetBlockWithHash(block.PrevHash)
  }
  // get all hashes between best hash and specified hash
  async GetHashsFromBestTo(toHash) {
    const betweenHashs = []

    const bestHash = await this.GetBestHash()
    betweenHashs.push(bestHash)

    let prevHash = bestHash
    while (prevHash !== toHash) {
      const prevBlock = await this.GetBlockWithHash(prevHash) // eslint-disable-line
      // add hash to between array
      betweenHashs.push(prevBlock.Blockhash())
      prevHash = prevBlock.PrevHash
    }
    return betweenHashs
  }


  // transaction is alway sending from own wallet to receiver
  CreateTX(recieverWallet, amount) {
    // return new Promise((resolve, reject) => {
    return Transaction.Create(this.Wallet, recieverWallet, amount)
    //     .catch(err => reject(err))
    //     .then(tx => resolve(tx))
    // })
  }

  // add a TX to the pending transactions
  // TODO: broadcast new pending TX to peers
  async SendTX(tx) {
    // is tx a Transaction object ?
    if (tx instanceof Transaction === false) { return (new Error('SendTX: argument is not a transaction')) }
    // is the Transaction object not empty ?
    if (Object.keys(tx).length === 0) { return (new Error('SendTX: Empty transaction supplied')) }
    // is the Transaction complete ?
    if (!Transaction.IsValid(tx)) { return (new Error('SendTX: transaction is not valid')) }

    // FIXME balance needs always up-to-date in db
    // also to easy to cheat? Each other node will check this tx before adding in a block

    if (tx.Amount > this.Wallet.Balance) { return (new Error('Not enough balance !')) }

    // add TX to pending pool
    await this.Db.Add(CstDocs.PendingTransactions, tx)
    // save tx.hash in wallet for fast lookup (get balance)
    const resultSaveTX = await Wallet.SaveOwnTX(tx.Hash, this.Db)
    return resultSaveTX
  }

  // create new block with all pending transactions
  // TODO POW / POS
  // TODO broadcast new block
  async MineBlock() {
    const syncing = await CheckSyncingNeeded(this.Db, this.NeededHashes)
    if (syncing) return ('Cannot mine a block, this node needs syncing')

    const { Db } = this

    const PendingTransactions = await AllPendingTX(Db)
    // TODO before adding check each tx: valid ? balance ?

    const prevHash = await this.GetBestHash()
    // create block

    // TODO set Max of TX in block
    const createdBlock = await Block.Create(prevHash, 0, Cst.StartDiff, PendingTransactions, Date.now()) // eslint-disable-line max-len

    const height = await this.GetHeight()
    // create new link with block
    const newLink = await ChainLink.Create(createdBlock, height + 1)

    // save link to blockchain
    await this.Db.Add(CstDocs.Blockchain, newLink)

    // clear pending transactions
    // TODO only remove tx's that are added in this block (once Max of TX are set)
    // TODO instead of removing, mark as 'processed' so there available in case of forks
    await ClearPendingTX(Db)

    return (createdBlock)
  }

  RenameWallet(newName) {
    this.Wallet.ChangeName(newName, this.Db)
  }

  /* CAN BE VERY COSTLY */
  SyncWallet() {
    return this.Wallet.CalcBalance(this.Db)
  }

  GetHeightOfBlock(block) {
    return new Promise((resolve, reject) => {
      this.Db.Find(CstDocs.Blockchain, { Hash: block.Blockhash() })
        .catch(err => reject(err))
        .then((foundLink) => {
          if (foundLink.length > 1) return reject(new Error(`Multiple blocks found with hash ${block.Blockchain()}`))
          if (foundLink.length === 0) return resolve(null)
          return resolve(foundLink[0].Height)
        })
    })
  }

  ConnectPeer(remoteIP, remotePort = Cst.DefaultPort) {
    this.p2p.Connect(remoteIP, remotePort)
  }

  async IncomingHash(inboundHash) {
    const block = await this.GetBlockWithHash(inboundHash)
    if (!block) {
      Debug('This node needs syncing ! Wait for incoming inv message')
      return []
    }
    Debug('Incoming hash is known, create inv message for peer')
    const HashesNeededByPeer = await this.GetHashsFromBestTo(inboundHash)
    return HashesNeededByPeer
  }

  // Store incoming block until all requests are fulfilled, the process block
  async IncomingBlock(inboundBlock) {
    const newBlock = Block.ParseFromDb(inboundBlock)
    if (!newBlock || !Block.IsValid(newBlock)) {
      return (new Error('Incoming p2p block is not valid'))
    }

    await this.Db.Add(CstDocs.IncomingBlocks, newBlock)
    const newHash = newBlock.Blockhash()
    this.NeededHashes = this.NeededHashes.filter(needed => needed !== newHash)
    Debug(`Still need  ${this.NeededHashes.length} blocks`)
    // still need other block before they can be evaluated
    if (this.NeededHashes.length !== 0) { return ('Incoming block stored') }

    // needed list empty ->  process stored blocks
    await this.ProcessRecievedBlocks()
    return ('Incoming block stored and all stored blocks are evaluated')
  }


  // all needed block are stored, now process them (check prevHash,..)
  // recursive until all blocks are evaluated
  async ProcessRecievedBlocks() {
    const processBlocksPromise = []
    const { Db, NeededHashes } = this

    const inboundBlocks = await Db.Find(CstDocs.IncomingBlocks, {})
    inboundBlocks.forEach((inboundBlock) => {
      processBlocksPromise.push(this.EvaluateRecievedBlock(inboundBlock))
    })

    Promise.all(processBlocksPromise)
      .then(async (result) => {
        Debug(`Incoming block processed, results: ${result}`)
        // check if syncing is done (all blocks are evaluated)
        const syncing = await CheckSyncingNeeded(Db, NeededHashes)
        if (syncing) {
          Debug('Still needs evaluation')
          this.ProcessRecievedBlocks()
        } else {
          Debug('All blocks are evaluated')
        }
      })
      .catch(err => console.error(err))
  }

  async EvaluateRecievedBlock(inboundBlock) {
    const newBlock = Block.ParseFromDb(inboundBlock)
    if (!newBlock) return ('ERROR: could not parse block')
    const blockhash = newBlock.Blockhash()
    const { Db } = this

    /*  check if block is already in blockchain */
    const foundBlock = await this.GetBlockWithHash(blockhash)
    if (foundBlock) {
      const removeKnownBlockResult = RemoveIncomingBlock(newBlock.PrevHash, Db, 'Incoming block already in blockchain, don\'t need to process')
      return removeKnownBlockResult
    }

    /* only 1 block needs evaluation --> this must be a new block on top of the blockchain */
    // amount of blocks that need evaluation
    const amountNeededEvaluation = await Db.CountDocs(CstDocs.IncomingBlocks)
    // check if this is a new block in the chain
    if (amountNeededEvaluation === 1) {
      const bestHash = await this.GetBestHash()
      // incoming block needed to be the next block in the blockchain
      if (newBlock.PrevHash !== bestHash) {
        const removeUnwantedBlockresult = await RemoveIncomingBlock(newBlock.PrevHash, Db, 'Incoming block is not next block in non-sync mode --> ignore block')
        return removeUnwantedBlockresult
      }
    }

    /* is previous block known in the blockchain?  */
    // try get previous block
    const prevBlock = await this.GetBlockWithHash(newBlock.PrevHash)
    if (!prevBlock) {
      return ('Previous block is not in the blockchain, keep block in stored incoming blocks, will need to evaluate again')
    }

    /* previous block is known, determine his height via previous block height */
    const prevHeight = await this.GetHeightOfBlock(prevBlock)
    // determine new height
    const newHeight = prevHeight + 1
    Debug(`Height if Incoming block will be ${newHeight}`)

    /* create new link with block */
    const newLink = await ChainLink.Create(newBlock, newHeight)
    // add link to the blockchain
    await Db.Add(CstDocs.Blockchain, newLink)

    /* TODO check if block contains receiving transactions for this wallet */
    // save tx to OwnTX
    // update balance

    /* remove block from incoming list */
    const removeResult = await RemoveIncomingBlock(newBlock.PrevHash, Db, (`Block ${blockhash} added in blockchain`))
    return removeResult
  }
}

module.exports = Coin
