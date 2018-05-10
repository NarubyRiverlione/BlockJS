
const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:block')

class Block {
  constructor(height, prevHash, nonce, diff, transactions, timestamp = Date.now, version = 1) {
    if (height === undefined
      || prevHash === undefined
      || nonce === undefined
      || diff === undefined) {
      Debug('Block header incomplete !')
      return
    }
    this.Height = height
    this.PrevHash = prevHash
    this.Nonce = nonce
    this.Diff = diff
    this.Version = version
    this.Timestamp = timestamp
    this.Transactions = transactions

    this.Hash = this.CreateBlockhash()
  }

  CreateBlockhash() {
    const Content = this.Height + this.PrevHash + this.Nonce + this.Diff + this.Timestamp + this.Version
    const HashTX = SHA256(JSON.stringify(this.Transactions)).toString()

    return SHA256(Content + HashTX).toString()
  }

  IsValid() {
    // header complete ?
    if (this.Height === undefined
      || this.PrevHash === undefined
      || this.Nonce === undefined
      || this.Diff === undefined) {
      Debug('Isvalid header incomplete')
      return false
    }
    // hash correct ?
    const HashNow = this.CreateBlockhash()
    if (this.Hash !== HashNow) {
      Debug(`Isvalid: hash changed: was ${this.Hash} and is now ${HashNow}`)
      return false
    }
    return true
  }

}

module.exports = Block 
