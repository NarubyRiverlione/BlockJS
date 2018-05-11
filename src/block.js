
const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:block')

class Block {
  constructor(prevHash, nonce, diff, transactions, timestamp, version = 1) {
    if (
      prevHash === undefined
      || nonce === undefined
      || diff === undefined
      || timestamp === undefined) {
      Debug('Block header incomplete !')
      return
    }

    this.PrevHash = prevHash
    this.Nonce = nonce
    this.Diff = diff
    this.Version = version
    this.Timestamp = timestamp
    this.Transactions = transactions
  }

  Blockhash() {
    const Content = this.PrevHash + this.Nonce + this.Diff + this.Timestamp + this.Version
    return SHA256(Content + this.TXhash).toString()
  }

  get TXhash() {
    return SHA256(JSON.stringify(this.Transactions)).toString()
  }

  IsHeaderComplete() {
    return (this.PrevHash !== undefined
      && this.Nonce !== undefined
      && this.Diff !== undefined
      && this.Timestamp !== undefined)
  }

  IsValid() {
    // header complete ?
    if (!this.IsHeaderComplete()) {
      Debug('Isvalid header incomplete')
      return false
    }
    return true
  }
}

module.exports = Block
