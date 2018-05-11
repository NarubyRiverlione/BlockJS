
const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:block')

const IsHeaderComplete = (block =>
  block.PrevHash !== undefined
  && block.Nonce !== undefined
  && block.Diff !== undefined
  && block.Timestamp !== undefined)

class Block {
  constructor(prevHash, nonce, diff, transactions, timestamp, version = 1) {
    if (
      prevHash === undefined
      || nonce === undefined
      || diff === undefined
      || timestamp === undefined) {
      Debug('ERROR Block header incomplete !')
      return
    }

    this.PrevHash = prevHash
    this.Nonce = nonce
    this.Diff = diff
    this.Version = version
    this.Timestamp = timestamp
    this.Transactions = transactions
  }
  get TXhash() {
    return SHA256(JSON.stringify(this.Transactions)).toString()
  }

  Blockhash() {
    const Content = this.PrevHash + this.Nonce + this.Diff + this.Timestamp + this.Version
    return SHA256(Content + this.TXhash).toString()
  }

  IsValid() {
    // header complete ?
    if (!IsHeaderComplete(this)) {
      Debug('ERROR Isvalid header incomplete')
      return false
    }
    return true
  }
}

module.exports = Block
