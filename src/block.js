
const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:block')
const Transactions = require('./transaction.js')

const IsHeaderComplete = (block =>
  block.PrevHash !== undefined
  && block.Nonce !== undefined
  && block.Diff !== undefined
  && block.Timestamp !== undefined)

class Block {
  static Create(prevHash, nonce, diff, transactions, timestamp, version = 1) {
    return new Promise((resolve, reject) => {
      if (
        prevHash === undefined
        || nonce === undefined
        || diff === undefined
        || timestamp === undefined) {
        return reject(new Error('ERROR Block header incomplete !'))
      }
      return resolve(new Block(prevHash, nonce, diff, transactions, timestamp, version))
    })
  }

  constructor(prevHash, nonce, diff, transactions, timestamp, version) {
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
    // all Block function now available
    return block
  }

  Blockhash() {
    const Content = this.PrevHash + this.Nonce + this.Diff + this.Timestamp + this.Version
    return SHA256(Content + this.HashTransactions).toString()
  }

  static IsValid(block) {
    // header complete ?
    if (!IsHeaderComplete(block)) {
      Debug('ERROR block is not valid: header incomplete')
      return false
    }
    // are all transaction valid ?
    if (block.Transactions && block.Transactions.length > 0) {
      block.Transactions.forEach((tx) => {
        if (!Transactions.IsValid(tx)) return false
        return true
      })
    }
    return true
  }
}

module.exports = Block
