const Transaction = require('./transaction.js')

const Cst = require('./const')
const crypto = require('crypto')
const PrivateKeySize = require('./const').PrivateKeySize // eslint-disable-line
const Debug = require('debug')('blockjs:wallet')

const CstDocs = Cst.Db.Docs

const FindInBlockchain = (TXhash, db) =>
  new Promise((resolve, reject) => {
    const filter = { 'Block.Transactions.Hash': TXhash }
    db.FindOne(Cst.Db.Docs.Blockchain, filter)
      .catch(err => reject(err))
      .then((foundLink) => {
        const TX = foundLink.Block.Transactions.find(tx => tx.Hash === TXhash)
        return resolve(TX)
      })
  })

// const RelativeTransactionInBlock = ((block, address) => {
//   const ownTX = []
//   block.Transactions.forEach((tx) => {
//     if (tx.FromAddress === address || tx.ToAddress === address) { ownTX.push(tx) }
//   })
//   return ownTX
// })

// const MaxRelativeHeight = RelativeBlockHeights => Math.max(...RelativeBlockHeights)

// const FindRelativeTX = ((links, wallet) => {
//   const { RelativeBlockHeights, Address } = wallet
//   const myTX = [] // tx in blockchain that contains this wallet address

//   // default scan complet blockchain
//   let needsScanning = links
//   if (RelativeBlockHeights.length > 0) {
//     // only sync missing part of blockchain
//     const syncToHeight = MaxRelativeHeight()
//     needsScanning = links.filter(link => link.Height > syncToHeight)
//   }

//   // find relative transactions for this wallet
//   needsScanning.forEach((link) => {
//     const { Height, Block } = link
//     myTX.push(...RelativeTransactionInBlock(Block, Address))
//     RelativeBlockHeights.push(Height)
//   })

//   return myTX
// })

// this.balance should be up-to-date

// document 'OwnTransactionHashs" should be up-to-date
//  --> update when sending TX
// --> todo: update when recieving block

class Wallet {
  static Load(db) {
    return new Promise((resolve, reject) => {
      db.Find(CstDocs.Wallet, {})
        .catch(err => reject(err))
        .then((walletDb) => {
          if (walletDb.length > 1) {
            reject(new Error('More the 1 wallet in database, cannot load'))
          }

          if (walletDb.length === 1) {
            Debug('Wallet loaded from db')
            const wallet = this.ParseFromDb(walletDb[0])
            return resolve(wallet)
          }

          if (walletDb.length === 0) {
            Debug('No wallet in database, create one now')
            const newWallet = new Wallet('New Wallet', null, 0)
            db.Add(CstDocs.Wallet, newWallet)
              .catch(err => reject(err))
              .then(() => resolve(newWallet))
          }
        })
    })
  }
  constructor(name, address, balance) {
    this.Name = name
    this.Address = address || crypto.randomBytes(PrivateKeySize).toString('hex')
    this.Balance = balance
    // this.Db = db
    // this.RelativeBlockHeights = []
  }

  static CheckIsWallet(check) {
    return check instanceof Wallet
  }

  static ParseFromDb(walletDb) {
    return new Wallet(
      walletDb.Name,
      walletDb.Address,
      walletDb.Balance,
    )
  }

  ChangeName(newName, db) {
    this.Name = newName
    const filter = { Address: this.Address }
    const update = { Name: newName }
    db.Update(CstDocs.Wallet, filter, update)
  }

  static SaveOwnTX(txhash, db) {
    return new Promise((resolve, reject) => {
      db.Add(CstDocs.OwnTx, { txhash })
        .catch(err => reject(err))
        .then(result => resolve(result))
    })
  }

  DeltaBalanceFromTX(tx) {
    if (tx.FromAddress === this.Address) return -tx.Amount
    else if (tx.ToAddress === this.Address) return tx.Amount
    return 0
  }

  //  calculate balance from all saved transactions
  // Warning: could be costly
  CalcBalance(db) {
    let { balance } = this
    balance = 0
    const myTX = []

    return new Promise((resolve, reject) => {
      const promisesFindTXs = []
      // get all TX hashs of own transactions from db
      db.Find(CstDocs.OwnTx, {})
        .then((TxHashs) => {
          // make promise(s) to get each TX based on the tx hash
          TxHashs.forEach((ownTXhashDoc) => {
            const { txhash } = ownTXhashDoc
            promisesFindTXs.push(
              // create array of promises to each find the TX in the blockchain with the TX has
              FindInBlockchain(txhash, db)
                .catch(err => reject(err))
                .then((ownTX) => { myTX.push(ownTX) }))
          })
          // get all relative transactions from db
          return Promise.all(promisesFindTXs)
        })
        .then(() => {
          // calculate the balance based on each transaction
          // send = debit, recieve = credit
          myTX.forEach((tx) => {
            balance += this.DeltaBalanceFromTX(tx)
          })
        })
        .then(() => {
          // save calculated balance to Db
          const filter = { Address: this.Address }
          const update = { Balance: balance }
          return db.Update(CstDocs.Wallet, filter, update)
        })
        .then(() => resolve(balance))
        .catch(err => reject(err))
    })
  }
}
module.exports = Wallet
