
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
  get HashTransactions() {
    return SHA256(JSON.stringify(this.Transactions)).toString()
  }

  // create instance of Block with db data
  static ParseFromDb(DBblock) {
    const block = new Block(
      DBblock.PrevHash,
      DBblock.Nonce,
      DBblock.Diff,
      DBblock.Transactions,
      DBblock.Timestamp,
      DBblock.Version,
    )
    // all Block function now availible
    return block
  }

  Blockhash() {
    const Content = this.PrevHash + this.Nonce + this.Diff + this.Timestamp + this.Version
    return SHA256(Content + this.HashTransactions).toString()
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
