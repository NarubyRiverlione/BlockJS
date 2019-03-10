/* Block: PrevHash, Nonce, Diff, Version, Timestamp, MessagesHash, Messages */
// const SHA256 = require('crypto-js/sha256')
const cryptoAsync = require('@ronomon/crypto-async')

const Debug = require('debug')('blockjs:block')

const { CstError, Cst } = require('../Const')
const Message = require('./message.js')


const CalcHash = content => new Promise((resolve, reject) => {
  const source = Buffer.from(content, 'utf8')
  cryptoAsync.hash(Cst.HashAlgorithm, source,
    (error, hash) => {
      if (error) { return reject(error) }
      return resolve(hash.toString('hex'))
    })
})


// PrevHash can be null = Genesis block
// other header properties must be a Number
const IsHeaderComplete = (block => block.PrevHash !== undefined
  && Number.isInteger(block.Height)
  && Number.isInteger(block.Nonce)
  && Number.isInteger(block.Diff)
  && Number.isInteger(block.Timestamp)
)

class Block {
  static async Create(prevHash, height, nonce, diff, messages, timestamp, version = 1) {
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

    const NewBlock = new Block(prevHash, height, nonce, diff, msgs, timestamp, version)

    NewBlock.Hash = await NewBlock.GetBlockHash()
    NewBlock.MessagesHash = await NewBlock.GetMsgsHash()
    return NewBlock
  }

  constructor(prevHash, height, nonce, diff, messages, timestamp, version) {
    this.PrevHash = prevHash
    this.Height = height
    this.Nonce = nonce
    this.Diff = diff
    this.Version = version
    this.Timestamp = timestamp
    this.Messages = messages
    this.Hash = null // cannot calculated async in constructor
    this.MessagesHash = null // cannot calculated async in constructor
  }

  async GetMsgsHash() {
    try {
      const AllMsgHashes = this.Messages ? this.Messages.reduce((acc, msg) => acc.concat(msg.Hash), '') : ''
      // const AllMsgAsString = JSON.stringify(this.Messages)
      // debugger
      return await CalcHash(AllMsgHashes)
    } catch (err) {
      /* istanbul ignore next */
      Debug(err.messages)
      /* istanbul ignore next */
      return null
    }
  }

  async GetBlockHash() {
    try {
      const {
        PrevHash, Nonce, Diff, Timestamp, Version,
      } = this
      const Header = PrevHash + Nonce + Diff + Timestamp + Version
      const hashContent = Header + (await this.GetMsgsHash())

      return await CalcHash(hashContent)
    } catch (err) {
      /* istanbul ignore next */
      Debug(err.messages)
      /* istanbul ignore next */
      return null
    }
  }

  // create instance of Block with db data
  // verify saved block hash, hash can only be correct of header is complete
  static async ParseFromDb(blockObj) {
    try {
      // remove database _id property from messages
      const messages = blockObj.Messages
        ? blockObj.Messages.map(msg => Message.ParseFromDb(msg))
        : null

      const {
        PrevHash, Height, Nonce, Diff, Timestamp, Version, Hash,
      } = blockObj

      const ParsedBlock = await Block.Create(PrevHash, Height, Nonce, Diff, messages, Timestamp, Version)
      if (!ParsedBlock) {
        Debug(`${CstError.ParseBlock} : ${blockObj}`)
        // debugger
        return null
      }
      // verify saved block hash with calculated
      if (Hash !== ParsedBlock.Hash) {
        Debug(`${CstError.ParseBlockWrongHash}: Saved=${Hash} <-> Calculated=${ParsedBlock.Hash}`)
        // debugger
        return null
      }
      // TODO verify MsgHash
      // all Block functions are now available
      return ParsedBlock
    } catch (err) { Debug(err.message); return null }
  }

  // add block to the Blockchain collection
  async Save(db) {
    try {
      // const Hash = await this.GetBlockHash()
      // const HashMessages = await this.GetMsgsHash()
      // const DbBlock = { ...this, Hash, HashMessages }
      const result = await db.Add(Cst.Db.Docs.Blockchain, this)
      return result
    } catch (err) {
      Debug(err.messages)
      return null
    }
  }

  // check if previous hash is a block in the blockchain
  async CheckPrevHash(blockchain) {
    try {
      if (this.PrevHash === null) {
        // only first block shouldn't have a prevHash
        if (this.Height !== 0 || this.Hash !== Cst.GenesisHashBlock) return false
        return true
      }
      const PrevBlock = await blockchain.GetBlockWithHash(this.prevHash)
      if (!PrevBlock) return false
      return true
    } catch (err) {
      return false
    }
  }

  // // add BlockHash and MessagesHash
  // async AddHashes() {
  //   try {
  //     const blockhash = await this.GetBlockHash()
  //     const msgshash = await this.GetMsgsHash()
  //     const BlockWithHashes = { ...this, Hash: blockhash, MessagesHash: msgshash }
  //     return BlockWithHashes
  //   } catch (err) { Debug(err.message); return null }
  // }

  //  is type of Block + header valid + all messages valid
  static async IsValid(checkBlock) {
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
      const MessagesValid = await checkBlock.Messages.reduce(async (acc, msg) => {
        const msgValid = await Message.IsValid(msg)
        return await acc && msgValid
      }, true)

      return MessagesValid
    }
    return true
  }
}

module.exports = Block
