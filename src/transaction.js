const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:transaction')
// const Cst = require('./const.js')
const Wallet = require('./wallet.js')


class Transaction {
  static Create(fromWallet, toWallet, amount, isCoinBaseTX = false) {
    return new Promise((resolve, reject) => {
      // CoinBaseTX has no fromWallet
      if (!Wallet.CheckIsWallet(fromWallet) && !isCoinBaseTX) { return reject(new Error('fromWallet is not a Wallet')) }

      if (!Wallet.CheckIsWallet(toWallet)) { return reject(new Error('toWallet is not a Wallet')) }

      if (typeof (amount) !== 'number') { return reject(new Error('Amount is not a number')) }

      return resolve(new Transaction(fromWallet, toWallet, amount, isCoinBaseTX))
    })
  }

  constructor(fromWallet, toWallet, amount, isCoinBaseTX) {
    this.FromAddress = isCoinBaseTX ? null : fromWallet.Address
    this.ToAddress = toWallet.Address
    this.Amount = amount
    this.CoinBaseTX = isCoinBaseTX
    this.Hash = this.Hash()
  }

  Hash() {
    const hash = SHA256(this.FromAddress + this.ToAddress + this.Amount)
    return hash.toString()
  }

  static IsValid(tx) {
    if (!tx.FromAddress && !tx.CoinBaseTX) {
      Debug('ERROR transaction is not valid: no from address in a not coinbased transaction')
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
}

module.exports = Transaction
