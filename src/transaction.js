const Debug = require('debug')('blockjs:transaction')

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.FromAddress = fromAddress
    this.ToAddress = toAddress
    this.Amount = amount
  }

  IsValid() {
    if (!this.FromAddress) {
      Debug('IsValid: no from address')
      return false
    }
    if (!this.ToAddress) {
      Debug('IsValid: no to address')
      return false
    }
    if (!this.Amount || typeof this.Amount !== 'number') {
      Debug('IsValid: no Amount')
      return false
    }
    return true
  }
}

module.exports = Transaction 