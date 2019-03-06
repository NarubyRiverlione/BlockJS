/* Block: PrevHash, Nonce, Diff, Version, Timestamp, MessagesHash, Messages */
const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:block')

const { CstError, Cst } = require('../Const')
const Message = require('./message.js')


// PrevHash can be null = Genesis block
// other header properties must be a Number
const IsHeaderComplete = (block => block.PrevHash !== undefined
  && Number.isInteger(block.Height)
  && Number.isInteger(block.Nonce)
  && Number.isInteger(block.Diff)
  && Number.isInteger(block.Timestamp)
)

class Block {
  static Create(prevHash, height, nonce, diff, messages, timestamp, version = 1) {
    // PrevHash can be null = Genesis block
    // other header properties must be a Number
    if (
      prevHash === undefined
      || !Number.isInteger(nonce)
      || !Number.isInteger(height)
      || !Number.isInteger(diff)
      || !Number.isInteger(timestamp)) {
      Debug(CstError.BlockHeaderIncomplete)
      return null
    }
    // remove database _id property from messages
    const msgs = messages
      ? messages.map(msg => Message.ParseFromDb(msg))
      : null

    return new Block(prevHash, height, nonce, diff, msgs, timestamp, version)
  }

  constructor(prevHash, height, nonce, diff, messages, timestamp, version) {
    this.PrevHash = prevHash
    this.Height = height
    this.Nonce = nonce
    this.Diff = diff
    this.Version = version
    this.Timestamp = timestamp
    this.Messages = messages
    this.HashMessages = this.CalcHashMessages()
    this.Hash = this.Blockhash() // calc BlockHas as last, needs other properties
  }

  CalcHashMessages() {
    return SHA256(JSON.stringify(this.Messages)).toString()
  }

  // create instance of Block with db data
  // verify saved block hash, hash can only be correct of header is complete
  static ParseFromDb(blockObj) {
    // remove database _id property from messages
    const messages = blockObj.Messages
      ? blockObj.Messages.map(msg => Message.ParseFromDb(msg))
      : null

    const {
      PrevHash, Height, Nonce, Diff, Timestamp, Version,
    } = blockObj

    const ParsedBlock = Block.Create(
      PrevHash, Height, Nonce, Diff, messages, Timestamp, Version,
    )
    if (!ParsedBlock) {
      Debug(`${CstError.ParseBlock} : ${blockObj}`)
      return null
    }
    // verify saved block hash with calculated
    if (blockObj.Hash !== ParsedBlock.Blockhash()) {
      Debug(`${CstError.ParseBlockWrongHash}: Saved=${blockObj.Hash} - Calculated=${ParsedBlock.Hash}`)
      return null
    }
    // all Block function now available
    return ParsedBlock
  }

  // Block hash = PrevHash + Nonce + Diff + Timestamp + Version + Hash Messages
  Blockhash() {
    const Header = this.PrevHash + this.Nonce + this.Diff + this.Timestamp + this.Version
    return SHA256(Header + this.HashMessages).toString()
  }

  // check if Prevhash is a block hash in the blockchain
  async CheckPrevHash(blockchain) {
    try {
      if (this.PrevHash === null) {
        // only first block shouldn't have a prevHash
        if (this.Height !== 0 || this.Blockhash() !== Cst.GenesisHashBlock) return false
        return true
      }
      const PrevBlock = await blockchain.GetBlockWithHash(this.prevHash)
      if (!PrevBlock) return false
      return true
    } catch (err) {
      return false
    }
  }

  //  is type of Block + header valid + all messages valid
  static IsValid(checkBlock) {
    if (!(checkBlock instanceof Block)) {
      Debug('ERROR block is not of type Block (loaded from db without cast?)')
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
