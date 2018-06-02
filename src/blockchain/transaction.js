const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:transaction')
// const Cst = require('./const.js')
const Wallet = require('./wallet.js')
const CstDocs = require('./const').Db.Docs

class Transaction {
  static Create(fromWallet, receiverAddress, amount, isCoinBaseTX = false) {
    return new Promise((resolve, reject) => {
      // CoinBaseTX has no fromWallet
      if (!Wallet.CheckIsWallet(fromWallet) && !isCoinBaseTX) { return reject(new Error('fromWallet is not a Wallet')) }

      // TODO check if address is valid
      if (!receiverAddress) { return reject(new Error('Receiver address is not valid')) }
      if (receiverAddress instanceof Wallet) { return reject(new Error('Receiver is a Wallet instead of an address')) }

      if (typeof (amount) !== 'number') { return reject(new Error('Amount is not a number')) }

      return resolve(new Transaction(fromWallet, receiverAddress, amount, isCoinBaseTX))
    })
  }

  constructor(fromWallet, receiverAddress, amount, isCoinBaseTX) {
    if (fromWallet) {
      this.FromAddress = isCoinBaseTX ? null : fromWallet.Address
    } else {
      this.FromAddress = null
    }
    this.ToAddress = receiverAddress
    this.Amount = amount
    this.CoinBaseTX = isCoinBaseTX
    this.TXhash = this.Hash()
  }

  Hash() {
    const hash = SHA256(this.FromAddress + this.ToAddress + this.Amount)
    return hash.toString()
  }
  static ParseFromDb(txDb) {
    const tx = new Transaction(
      null, // FIXME: Db stores from address, not the wallet
      txDb.ToAddress,
      txDb.Amount,
      txDb.CoinBaseTX,
    )
    tx.FromAddress = txDb.FromAddress
    return tx
  }
  static IsValid(tx) {
    if (!tx.FromAddress && !tx.CoinBaseTX) {
      Debug('ERROR transaction is not valid: no from address in a non-coinbased transaction')
      return false
    }
    if (!tx.ToAddress) {
      Debug('ERROR transaction is not valid: no to address')
      return false
    }
    if (!tx.Amount || typeof tx.Amount !== 'number') {
      Debug('ERROR transaction is not valid: no amount')
      return false
    }
    // todo check amount <= balance of fromAddress ?
    return true
  }

  // save to db
  Save(db) {
    return db.Add(CstDocs.PendingTransactions, this)
  }
}

module.exports = Transaction
