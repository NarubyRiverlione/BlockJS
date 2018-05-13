const Transaction = require('./transaction.js')
const Block = require('./block.js')
const Wallet = require('./wallet.js')
const ChainLink = require('./chainlink.js')
const Cst = require('./const.js')
const DB = require('./db.js')
const Debug = require('debug')('blockjs:blockchain')

const CstDocs = Cst.Db.Docs

const ReadBlockchainFromDb = Db =>
  new Promise((resolve, reject) => {
    Db.LoadAll(CstDocs.Blockchain)
      .catch(err => reject(err))
      .then(loadedBlockchain => resolve(loadedBlockchain))
  })
const AllBlockHashs = Db =>
  new Promise((resolve, reject) => {
    const filter = {}
    const select = { HASH: 1 }
    Db.FindSelect(CstDocs.Blockchain, filter, select)
      .catch(err => reject(err))
      .then(allHashs => resolve(allHashs))
  })

const CreateGenesisBlock = () => {
  const GenesisWallet = new Wallet(Cst.GenesisRewardWallet, Cst.GenesisAddress)
  const GenesisTX = new Transaction(null, GenesisWallet, Cst.GenesisReward, true)
  return new Block(null, 0, Cst.StartDiff, [GenesisTX], Cst.GenesisTimestamp)
}

const GenesisBlockExistInDb = Db =>
  new Promise((resolve, reject) => {
    Db.Find(CstDocs.Blockchain, { Height: 0 })
      .catch(err => reject(err))
      .then(firstLink =>
        resolve(firstLink.length !== 0))
  })


const CreateFirstLink = () => {
  const GenesisBlock = CreateGenesisBlock()
  const GenesisLink = new ChainLink(GenesisBlock, 0)
  return GenesisLink
}

const ClearPendingTX = Db =>
  new Promise((resolve, reject) => {
    Db.RemoveAllDocs(CstDocs.PendingTransactions)
      .catch(err => reject(err))
      .then(result => resolve(result))
  })
const AllPendingTX = Db =>
  new Promise((resolve, reject) => {
    Db.Find(CstDocs.PendingTransactions, {})
      .catch(err => reject(err))
      .then(result => resolve(result))
  })

const CreateBlockchain = Db =>
  new Promise((resolve, reject) => {
    // no links in database = no genesis block (first run?)
    // create blockchain by adding genesis block

    const FirstLink = CreateFirstLink()
    Debug('Save genesis in Db')
    Db.Add(CstDocs.Blockchain, FirstLink)
      .then(() => resolve())
      .catch(err => reject(err))
  })

class Coin {
  /* start coin, if new add genesis
    load wallet from db
  */
  static Start() {
    return new Promise((resolve, reject) => {
      const database = new DB()
      let coin

      database.Connect()
        .catch(err => reject(new Error(`Cannot create coin because could not connect to database: ${err}`)))
        .then(() => Wallet.Load(database))
        .then((wallet) => {
          coin = new Coin(database, wallet)
          return GenesisBlockExistInDb(database)
        })
        .then((GenesesExist) => {
          if (GenesesExist) {
            Debug('Found genisses block in Db')
            return resolve(coin)
          }
          Debug('No blockchain in Db, create blockchain by adding Genesis Block')
          return CreateBlockchain(database)
        })
        .catch(err => reject(err))
        .then(() => resolve(coin))
    })
  }

  // close Db connection
  End() {
    this.Db.Close()
  }
  constructor(Db, wallet, version = 1) {
    this.Db = Db
    this.Version = version
    this.BlockReward = Cst.StartBlockReward
    this.Wallet = wallet
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
          return this.GetHash()
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
  GetHash() {
    return new Promise((resolve, reject) => {
      this.GetLastBlock()
        .catch(err => reject(err))
        .then((lastblockInDB) => {
          const lastBlock = Block.ParseFromDb(lastblockInDB)
          // Blockhash function now availible
          return resolve(lastBlock.Blockhash())
        })
    })
  }
  // get amount of pending transactions
  GetAmountOfPendingTX() {
    return new Promise((resolve, reject) => {
      this.Db.CountDocs(CstDocs.Blockchain)
        .catch(err =>
          reject(err))
        .then(amount =>
          resolve(amount))
    })
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
          resolve(foundLinks[0].Block))
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
          return resolve(foundLink[0].Block)
        })
    })
  }
  // get block with specific blockhash
  GetBlockWithHash(blockhash) {
    return new Promise((resolve, reject) => {
      this.Db.Find(CstDocs.Blockchain, { Hash: blockhash })
        .catch(err => reject(err))
        .then((foundLink) => {
          if (foundLink.length > 1) return reject(new Error(`Multiple blocks found with hash ${blockhash}`))
          if (foundLink.length === 0) return resolve(null)
          return resolve(foundLink[0].Block)
        })
    })
  }
  // transaction is alway sending from own wallet to reciever
  CreateTX(recieverWallet, amount) {
    return new Transaction(this.Wallet, recieverWallet, amount)
  }

  // add a TX to the pending TX
  SendTX(tx) {
    return new Promise((resolve, reject) => {
      if (tx instanceof Transaction === false) { return reject(new Error('SendTX: argument is not a Transaction')) }

      if (!tx.IsValid()) { return reject(new Error(Debug('SendTX: tx is not valid'))) }

      // add TX to pending pool
      this.Db.Add(CstDocs.PendingTransactions, tx)
        // save tx.hash in wallet for fast lookupt (get balance)
        .then(() => Wallet.SaveOwnTX(tx.Hash, this.Db))
        .then(result => resolve(result))
        .catch(err => reject(err))
    })
  }
  // create new block with all pending transactions
  // TODO POW
  MineBlock() {
    return new Promise((resolve, reject) => {
      let newBlock
      let PendingTransactions
      const { Db } = this

      AllPendingTX(Db)
        .then((pending) => {
          PendingTransactions = pending
          return this.GetHash()
        })
        .then((prevHash) => {
          // TODO set Max of TX in block
          // FIXME timestamp in POW needs constant
          newBlock = new Block(
            prevHash,
            0,
            Cst.StartDiff,
            PendingTransactions,
            Date.now(),
          )
          return this.GetHeight()
        })
        .then((height) => {
          // add block (if valid) to blockchain
          const newLink = new ChainLink(newBlock, height + 1)
          if (newLink) {
            this.Db.Add(CstDocs.Blockchain, newLink)
              .then(() =>
                // clear pending transactions
                // TODO instead of removing, mark as 'processed' so there availible in case of forks
                ClearPendingTX(Db))
              .then(() => resolve(newBlock))

              .catch(err => reject(err))
          }
        })
    })
  }

  RenameWallet(newName) {
    this.Wallet.ChangeName(newName, this.Db)
  }

  /* CAN BE VERY COSTLY */
  Sync() {
    return new Promise((resolve, reject) => {
      this.Wallet.CalcBalance(this.Db)
        .catch(err => reject(err))
        .then(result => resolve(result))
    })
  }

  /* CAN BE VERY COSTLY FOR TO KEEP FULL BLOCKCHAIN IN MEMORY */
  // LoadBlockChain() {
  //   return new Promise((resolve, reject) => {
  //     const { Db } = this
  //     ReadBlockchainFromDb(Db)
  //       .catch(err => reject(err))
  //       .then((loadedBlockchain) => {
  //         if (!loadedBlockchain || loadedBlockchain.length === 0) {
  //           // no blockchain in database (first run?)
  //           // create blockchain by adding genesis block
  //           Debug('No blockchain in Db, create blockchain by adding Genesis Block')
  //           const newBlockchain = CreateBlockchain()
  //           Debug('Save new blockchain in Db')
  //           Db.Save(CstDocs.Blockchain, newBlockchain[0])
  //           resolve(newBlockchain)
  //         } else {
  //           // use loaded blockchain
  //           Debug('Blockchain loaded from db')
  //           resolve(loadedBlockchain)
  //         }
  //       })
  //   })
  // }


  /* FIXME: CAN BE VERY COSTLY FOR TO KEEP FULL BLOCKCHAIN IN MEMORY */
  // IsValid() {
  //   // const allHashs = this.Blockchain.map(link => link.Hash)
  //   AllBlockHashs(this.Db)
  //     .then((allHashs) => {
  //       let ok = true
  //       this.Blockchain.forEach((link) => {
  //         const { Block: blockInLink } = link
  //         // each block should be valid
  //         if (!Block.IsValid(blockInLink)) {
  //           Debug(`ERROR Invalid block found: ${blockInLink}`)
  //           Debug(`ERROR Block: ${blockInLink}`)
  //           ok = false
  //           return
  //         }
  //         // has of block should be same as stored hash
  //         if (blockInLink.Blockhash() !== link.Hash) {
  //           Debug(`ERROR Blockhash is not same as stored (${link.Hash})`)
  //           Debug(`ERROR Block: ${blockInLink}`)
  //           ok = false
  //           return
  //         }
  //         // previous hash must be in blockchain (expect genesis block with height 0)
  //         if (link.Height !== 0 && !allHashs.includes(blockInLink.PrevHash)) {
  //           Debug(`ERROR Previous hash ${blockInLink.PrevHash} of block is not in blockchain`)
  //           Debug(`ERROR Block: ${blockInLink}`)
  //           ok = false
  //         }
  //       })
  //       return ok
  //     })
  // }

  // toString() {
  //   return JSON.stringify(this)
  // }

  // GetBalance(wallet) {
  //   if (!Wallet.CheckIsWallet(wallet)) return 'ERROR: argument must be a Wallet'
  //   // FIXME: costly !!
  //   return wallet.GetBalance(this.LoadBlockChain())
  // }
}

module.exports = Coin
