const Debug = require('debug')('blockjs:transaction')
const Wallet = require('./wallet.js')


class Transaction {
  constructor(fromWallet, toWallet, amount, isCoinBaseTX = false) {
    // CoinBaseTX has no from
    if (!Wallet.CheckIsWallet(fromWallet) && !isCoinBaseTX) {
      Debug('fromWallet is not a Wallet')
      return null
    }
    if (!Wallet.CheckIsWallet(toWallet)) {
      Debug('toWallet is not a Wallet')
      return null
    }
    if (typeof (amount) !== 'number') {
      Debug('Ampint is not a number')
      return null
    }
    this.FromAddress = isCoinBaseTX ? null : fromWallet.Address
    this.ToAddress = toWallet.Address
    this.Amount = amount
  }

  IsValid() {
    if (!this.FromAddress) {
      Debug('ERROR IsValid: no from address')
      return false
    }
    if (!this.ToAddress) {
      Debug('ERROR IsValid: no to address')
      return false
    }
    if (!this.Amount || typeof this.Amount !== 'number') {
      Debug('ERROR IsValid: no Amount')
      return false
    }
    return true
  }
}

module.exports = Transaction
