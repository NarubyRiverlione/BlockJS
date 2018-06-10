
const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:block')
const Message = require('./message.js')


const IsHeaderComplete = (block =>
  block.PrevHash !== undefined
  && block.Nonce !== undefined
  && block.Diff !== undefined
  && block.Timestamp !== undefined)

class Block {
  static Create(prevHash, nonce, diff, messages, timestamp, version = 1) {
    if (
      prevHash === undefined
      || nonce === undefined
      || diff === undefined
      || timestamp === undefined) {
      Debug(new Error('ERROR Block header incomplete !'))
      return null
    }
    // remove database _id property from messages
    const msgs = messages.map(msg => Message.ParseFromDb(msg))

    return new Block(prevHash, nonce, diff, msgs, timestamp, version)
  }

  constructor(prevHash, nonce, diff, messages, timestamp, version) {
    this.PrevHash = prevHash
    this.Nonce = nonce
    this.Diff = diff
    this.Version = version
    this.Timestamp = timestamp
    this.Messages = messages
    this.HashMessages = this.CalcHashMessages()
  }

  CalcHashMessages() {
    return SHA256(JSON.stringify(this.Messages)).toString()
  }

  // create instance of Block with db data
  static ParseFromDb(DBblock) {
    // remove database _id property from messages
    const messages = DBblock.Messages.map(msg => Message.ParseFromDb(msg))

    const block = new Block(
      DBblock.PrevHash,
      DBblock.Nonce,
      DBblock.Diff,
      messages,
      DBblock.Timestamp,
      DBblock.Version,
      DBblock.HashMessages,
    )
    // all Block function now available
    return block
  }

  Blockhash() {
    const Content = this.PrevHash + this.Nonce + this.Diff + this.Timestamp + this.Version
    return SHA256(Content + this.HashMessages).toString()
  }

  static IsValid(block) {
    if (!(block instanceof Block)) {
      Debug('block is not of type Block (loaded from db without cast?)')
      return false
    }
    // header complete ?
    if (!IsHeaderComplete(block)) {
      Debug('ERROR block is not valid: header incomplete')
      return false
    }
    // are all Messages valid ?
    if (block.Messages && block.Messages.length > 0) {
      block.Messages.forEach((msg) => {
        if (!Message.IsValid(msg)) return false
        return true
      })
    }
    return true
  }
}

module.exports = Block
