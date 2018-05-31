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

// document 'OwnTransactionHashes" should be up-to-date
//  --> update when sending TX


class Wallet {
  static Load(db) {
    return new Promise((resolve, reject) => {
      db.Find(CstDocs.Wallet, {})
        .catch(err => reject(err))
        .then((walletDb) => {
          if (walletDb.length > 1) {
            return reject(new Error('More the 1 wallet in database, cannot load'))
          }

          if (walletDb.length === 1) {
            Debug('Wallet loaded from db')
            const wallet = this.ParseFromDb(walletDb[0])
            return resolve(wallet)
          }

          if (walletDb.length === 0) {
            Debug('No wallet in database, create one now')
            const newWallet = new Wallet('New Wallet', null)
            const DebugMode = process.env.NODE_ENV === 'development'
            Debug(`In debug mode, start with ${Cst.DebugStartWalletAmount}`)
            newWallet.Balance = DebugMode ? Cst.DebugStartWalletAmount : 0
            db.Add(CstDocs.Wallet, newWallet)
              .catch(err => reject(err))
              .then(() => resolve(newWallet))
          }
        })
    })
  }
  constructor(name, address) {
    this.Name = name
    this.Address = address || Cst.AddressPrefix.concat(crypto.randomBytes(PrivateKeySize).toString('hex'))
  }

  static CheckIsWallet(check) {
    return check instanceof Wallet
  }

  static ParseFromDb(walletDb) {
    return new Wallet(
      walletDb.Name,
      walletDb.Address,
    )
  }

  GetBalance(Db) {
    const filter = { Address: this.Address }
    return new Promise((resolve, reject) => {
      Db.FindOne(CstDocs.Wallet, filter)
        .then(wallet => resolve(wallet.Balance))
        .catch(err => reject(err))
    })
  }

  ChangeName(newName, db) {
    this.Name = newName
    const filter = { Address: this.Address }
    const update = { Name: newName }
    return db.Update(CstDocs.Wallet, filter, update)
  }

  static SaveOwnTX(txhash, db) {
    return db.Add(CstDocs.OwnTx, { txhash })
  }

  DeltaBalanceFromTX(tx) {
    if (tx.FromAddress === this.Address) return -tx.Amount
    else if (tx.ToAddress === this.Address) return tx.Amount
    return 0
  }

  // calculate the balance based on own transactions
  // send = debit, receive = credit
  UpdateBalanceFromTxs(myTXs, db, oldBalance = 0) {
    let newBalance = oldBalance
    myTXs.forEach((tx) => {
      newBalance += this.DeltaBalanceFromTX(tx)
    })
    return newBalance
  }

  // save calculated balance to Db
  SaveBalanceToDb(newBalance, db) {
    const filter = { Address: this.Address }
    const update = { Balance: newBalance }
    return new Promise((resolve, reject) => {
      db.Update(CstDocs.Wallet, filter, update)
        .then(() => resolve(newBalance))
        .catch(err => reject(err))
    })
  }

  //  calculate balance from all saved transactions
  // Warning: could be costly
  CalcBalance(db) {
    const myTXs = []

    return new Promise((resolve, reject) => {
      const promisesFindTXs = []
      // get all TX hashes of own transactions from db
      db.Find(CstDocs.OwnTx, {})
        .then((ownTXhashes) => {
          // make promise(s) to get each TX based on the tx hash
          ownTXhashes.forEach((ownTXhashDoc) => {
            const { txhash } = ownTXhashDoc
            const findPromise =
              // create array of promises to each find the TX in the blockchain with the TX has
              FindInBlockchain(txhash, db)
                .catch(err => reject(err))
                .then((ownTX) => {
                  myTXs.push(ownTX)
                  // return Wallet.SaveOwnTX(ownTX.Hash, db)
                })

            promisesFindTXs.push(findPromise)
          })
          // get all relative transactions from db
          return Promise.all(promisesFindTXs)
        })
        .then(() => this.UpdateBalanceFromTxs(myTXs, db))
        .then(balance => this.SaveBalanceToDb(balance))
        .then(balance => resolve(balance))
        .catch(err => reject(err))
    })
  }

  // check if there are relevant transactions for this wallet in the
  // --> update balance and save tx in db
  IncomingBlock(block, db) {
    return new Promise((resolve, reject) => {
      const ownTXs = this.FindOwnTXinBlock(block)
      if (ownTXs.length === 0) { return resolve() }
      Debug(`Found ${ownTXs.length} transactions for this wallet in incoming block`)
      const newOwnTXpromises = []
      // save any tx for this wallet to OwnTX
      ownTXs.forEach(tx => newOwnTXpromises.push(Wallet.SaveOwnTX(tx.TXhash, db)))
      Promise.all(newOwnTXpromises)
        // get current balance
        .then(() => this.GetBalance(db))
        // update balance with found own tx's
        .then(oldBalance => this.UpdateBalanceFromTxs(ownTXs, db, oldBalance))
        // save updated balance
        .then(balance => this.SaveBalanceToDb(balance, db))
        // return updated balance
        .then(newBalance => resolve(newBalance))
        .catch(err => reject(err))
    })
  }

  FindOwnTXinBlock(block) {
    const incommingTXs = []
    block.Transactions.forEach((tx) => {
      if (tx.ToAddress === this.Address) { incommingTXs.push(tx) }
    })
    return incommingTXs
  }
}
module.exports = Wallet
