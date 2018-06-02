const Transaction = require('./transaction.js')
const Block = require('./block.js')
const Wallet = require('./wallet.js')
const Cst = require('./const.js')
const DB = require('./db.js')
const P2P = require('./p2p.js')
const API = require('../api/express.js')
const Genesis = require('./genesis.js')
const Mining = require('./mining.js')

// const http = require('http')
const https = require('https')
const fs = require('fs')
const Debug = require('debug')('blockjs:coin')

const CstDocs = Cst.Db.Docs
const CstAPI = Cst.API

class Coin {
  /* start coin :
  - connect to Db
  - load wallet from db
  - add genesis block if it doesn't exist
  - start peer 2 peer server
  */
  static async Start(
    serverPort = Cst.DefaultServerPort,
    DbServer = '127.0.0.1',
    DbPort = Cst.Db.DefaultPort,
    APIPort = Cst.API.DefaultPort,
  ) {
    const database = new DB()
    await database.Connect(DbServer, DbPort)

    // load wallet
    const wallet = await Wallet.Load(database)

    // make coin
    const coin = new Coin(database, wallet)

    // check if genesis block exists
    const GenesesExist = await Genesis.BlockExistInDb(database)
    // create genesis if needed
    if (!GenesesExist) {
      Debug('No blockchain in Db, create blockchain by adding Genesis Block')
      const FirstLink = await Genesis.CreateBlockchain(database)
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

    // start API server
    coin.api = API(coin)
    // const server = http.createServer(App)
    // setImmediate(() => {
    //   server.listen(CstAPI.DefaultPort, CstAPI.IP, () => {
    //     Debug(`Express server listening on http://${CstAPI.IP}:${CstAPI.DefaultPort}`)
    //   })
    // })

    const secureServer = https.createServer(coin.SSL_OPTIONS, coin.api)
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
    this.p2p.Close()
  }
  constructor(Db, wallet, version = 1) {
    this.Db = Db
    this.Version = version
    this.BlockReward = Cst.StartBlockReward
    this.Wallet = wallet
    this.p2p = null // p2p started when local blockchain is loaded or created
    this.NeededHashes = []

    this.SSL_OPTIONS = {
      key: fs.readFileSync('./src/keys/ssl.key'),
      cert: fs.readFileSync('./src/keys/ssl.crt'),
      // ca: fs.readFileSync('./keys/intermediate.crt'),
    }
  }

  GetBalance() {
    return this.Wallet.GetBalance(this.Db)
  }
  // get name, address and balance of wallet
  GetWalletInfo() {
    return new Promise((resolve, reject) => {
      this.GetBalance()
        .then((balance) => {
          const walletInfo = Object.assign({ Balance: balance }, this.Wallet)
          return resolve(walletInfo)
        })
        .catch(err => reject(err))
    })
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
  // get amount of pending transactions
  GetAmountOfPendingTX() {
    return this.Db.CountDocs(CstDocs.PendingTransactions)
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

  // GetPrevBlock(block) {
  //   return this.GetBlockWithHash(block.PrevHash)
  // }

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

  // transaction is alway sending from own wallet to receiver
  CreateTX(receiverAddress, amount) {
    return Transaction.Create(this.Wallet, receiverAddress, amount)
  }

  // add a TX to the pending transactions
  async SendTX(tx) {
    // is tx a Transaction object ?
    if (tx instanceof Transaction === false) { return (new Error('SendTX: argument is not a transaction')) }
    // is the Transaction object not empty ?
    if (Object.keys(tx).length === 0) { return (new Error('SendTX: Empty transaction supplied')) }
    // is the Transaction complete ?
    if (!Transaction.IsValid(tx)) { return (new Error('SendTX: transaction is not valid')) }

    // TODO: also to easy to cheat? Each other node will check this tx before adding in a block
    const balance = await this.Wallet.GetBalance(this.Db)
    if (tx.Amount > balance) { return (new Error('SendTX: Not enough balance !')) }

    // credit balance
    const newBalance = balance - tx.Amount
    // save new balance
    await this.Wallet.SaveBalanceToDb(newBalance, this.Db)
    // add TX to pending pool
    await this.SavePendingTx(tx)
    // broadcast new pending TX to peers
    this.p2p.Broadcast(Cst.P2P.TRANSACTION, tx)
    // save tx.hash in wallet for fast lookup to get balance
    const resultSaveTX = await Wallet.SaveOwnTX(tx.TXhash, this.Db)

    return resultSaveTX.result
  }

  // save an pending tx
  SavePendingTx(tx) {
    return this.Db.Add(CstDocs.PendingTransactions, tx)
  }

  // create new block with all pending transactions
  async MineBlock() {
    await Mining.MineBlock(this)
  }

  RenameWallet(newName) {
    return new Promise((resolve, reject) => {
      if (!newName) { return reject(new Error('No new name')) }
      this.Wallet.ChangeName(newName, this.Db)
        .then(() => this.GetWalletInfo())
        .then(walletInfo => resolve(walletInfo))
        .catch(err => reject(err))
    })
  }

  /* CAN BE VERY COSTLY */
  CalcWalletAmountFromSavedOwnTXs() {
    return this.Wallet.CalcBalance(this.Db)
  }


  ConnectPeer(remoteIP, remotePort = Cst.DefaultServerPort) {
    this.p2p.Connect(remoteIP, remotePort)
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
