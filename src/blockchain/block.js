/* Block: PrevHash, Nonce, Diff, Version, Timestamp, MessagesHash, Messages */
const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:block')

const { CstError } = require('../blockchain/const')
const Message = require('./message.js')


// PrevHash can be null = Genesis block
// other header properties must be a Number
const IsHeaderComplete = (block => block.PrevHash !== undefined
  && Number.isInteger(block.Nonce)
  && Number.isInteger(block.Diff)
  && Number.isInteger(block.Timestamp)
)

class Block {
  static Create(prevHash, nonce, diff, messages, timestamp, version = 1) {
    // PrevHash can be null = Genesis block
    // other header properties must be a Number
    if (
      prevHash === undefined
      || !Number.isInteger(nonce)
      || !Number.isInteger(diff)
      || !Number.isInteger(timestamp)) {
      Debug(new Error(CstError.BlockHeaderIncomplete))
      return null
    }
    // remove database _id property from messages
    const msgs = messages
      ? messages.map(msg => Message.ParseFromDb(msg))
      : null

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
    const messages = DBblock.Messages
      ? DBblock.Messages.map(msg => Message.ParseFromDb(msg))
      : null

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

  // Block hash = PrevHash + Nonce + Diff + Timestamp + Version + Hash Messages
  Blockhash() {
    const Content = this.PrevHash + this.Nonce + this.Diff + this.Timestamp + this.Version
    return SHA256(Content + this.HashMessages).toString()
  }

  //  is type of Block + header valid + all messages valid
  static IsValid(checkBlock) {
    if (!(checkBlock instanceof Block)) {
      Debug('block is not of type Block (loaded from db without cast?)')
      return false
    }
    // header complete ?
    if (!IsHeaderComplete(checkBlock)) {
      Debug('ERROR block is not valid: header incomplete')
      return false
    }
    // are all Messages valid ?
    if (checkBlock.Messages && checkBlock.Messages.length > 0) {
      let MessagesValid = true
      checkBlock.Messages.forEach((msg) => {
        MessagesValid = MessagesValid && Message.IsValid(msg)
      })
      return MessagesValid
    }
    return true
  }
}

module.exports = Block
