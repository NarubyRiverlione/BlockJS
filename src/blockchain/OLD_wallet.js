const Cst = require('./const')
const crypto = require('crypto')
const PrivateKeySize = require('./const').PrivateKeySize // eslint-disable-line
const Debug = require('debug')('blockjs:wallet')

const CstDocs = Cst.Db.Docs

const FindInBlockchain = (TXhash, db) =>
  new Promise((resolve, reject) => {
    const filter = { 'Block.Transactions.TXhash': TXhash }
    db.FindOne(CstDocs.Blockchain, filter)
      .catch(err => reject(err))
      .then((foundLink) => {
        if (!foundLink) { return reject(new Error(`Could not find msg ${TXhash} in the blockchain`)) }
        const TX = foundLink.Block.Transactions.find(msg => msg.TXhash === TXhash)
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


  DeltaBalanceFromTX(msg) {
    if (msg.FromAddress === this.Address) return -msg.Amount
    else if (msg.ToAddress === this.Address) return msg.Amount
    return 0
  }

  // calculate the balance based on own messages
  // send = debit, receive = credit
  UpdateBalanceFromTxs(myTXs, db, oldBalance = 0) {
    let newBalance = oldBalance
    myTXs.forEach((msg) => {
      newBalance += this.DeltaBalanceFromTX(msg)
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

  //  calculate balance from all saved messages
  // Warning: could be costly
  CalcBalance(db) {
    const myTXs = []

    return new Promise((resolve, reject) => {
      const promisesFindTXs = []
      // get all TX hashes of own messages from db
      db.Find(CstDocs.OwnTx, {})
        .then((ownTxHashes) => {
          // make promise(s) to get each TX based on the msg hash
          ownTxHashes.forEach((ownTXhashDoc) => {
            const { msghash } = ownTXhashDoc
            const findPromise =
              // create array of promises to each find the TX in the blockchain with the TX has
              FindInBlockchain(msghash, db)
                .catch(err => reject(err))
                .then((ownTX) => {
                  myTXs.push(ownTX)
                  // return Wallet.SaveOwnTX(ownTX.Hash, db)
                })

            promisesFindTXs.push(findPromise)
          })
          // get all relative messages from db
          return Promise.all(promisesFindTXs)
        })
        .then(() => this.UpdateBalanceFromTxs(myTXs, db))
        .then(balance => this.SaveBalanceToDb(balance, db))
        .then(balance => resolve(balance))
        .catch(err => reject(err))
    })
  }

  // check if there are relevant messages for this wallet in the
  // --> update balance and save msg in db
  IncomingBlock(block, db) {
    return new Promise((resolve, reject) => {
      const ownTXs = this.FindOwnTXinBlock(block)
      if (ownTXs.length === 0) { return resolve() }
      Debug(`Found ${ownTXs.length} messages for this wallet in incoming block`)
      const newOwnTxPromises = []
      // save any msg for this wallet to OwnTX
      ownTXs.forEach(msg => newOwnTxPromises.push(Wallet.SaveOwnTX(msg.TXhash, db)))
      Promise.all(newOwnTxPromises)
        // get current balance
        .then(() => this.GetBalance(db))
        // update balance with found own msg's
        .then(oldBalance => this.UpdateBalanceFromTxs(ownTXs, db, oldBalance))
        // save updated balance
        .then(balance => this.SaveBalanceToDb(balance, db))
        // return updated balance
        .then(newBalance => resolve(newBalance))
        .catch(err => reject(err))
    })
  }

  FindOwnTXinBlock(block) {
    const incomingTXs = []
    block.Transactions.forEach((msg) => {
      if (msg.ToAddress === this.Address) { incomingTXs.push(msg) }
    })
    return incomingTXs
  }
}
module.exports = Wallet
