/* Block: PrevHash, Nonce, Diff, Version, Timestamp, MessagesHash, Messages */
// const SHA256 = require('crypto-js/sha256')


const Debug = require('debug')('blockjs:block')
const { ParseMessageFromDb, IsMessageValid } = require('./message.js')
const { CalcHash, ExportPublicDER } = require('./crypt')

const { CstError, Cst } = require('../Const')


// target is string of consecutive numbers equal to the difficulty
// ex. diff=4 --> target ='0123'
const CreateTarget = (diff) => {
  let target = ''
  for (let digit = 0; digit < diff; digit += 1) {
    target = target.concat(digit)
  }
  return target
}

// check if valid solution: hash begins with same as target
const CheckPoW = (Diff, Hash) => {
  const Target = CreateTarget(Diff)
  const TestTarget = Hash.slice(0, Diff)
  return TestTarget === Target
}

// PrevHash can be null = Genesis block
// other header properties must be a Number
const IsHeaderComplete = (block) => block.PrevHash !== undefined
  && Number.isInteger(block.Height)
  && Number.isInteger(block.Nonce)
  && Number.isInteger(block.Diff)
  && Number.isInteger(block.Timestamp)


class Block {
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

  // add block to the Blockchain collection
  async Save(db) {
    try {
      // const Hash = await this.GetBlockHash()
      // const HashMessages = await this.GetMsgsHash()
      // const DbBlock = { ...this, Hash, HashMessages }
      debugger
      // save Public key in each message in DER format
      const ParsedMsg = this.Messages.map((msg) => {
        const ParsedPub = ExportPublicDER(msg.PublicKey)
        return { msg, PublicKey: ParsedPub }
      })
      this.Messages = ParsedMsg
      debugger
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
}


// Create a block
const CreateBlock = async (prevHash, height, nonce, diff, messages, timestamp, version = 1) => {
  try {
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
    // // remove database _id property from messages
    // const msgs = messages
    //   ? messages.map(msg => ParseMessageFromDb(msg))
    //   : null

    const NewBlock = new Block(prevHash, height, nonce, diff, messages, timestamp, version)
    NewBlock.Hash = await NewBlock.GetBlockHash()
    NewBlock.MessagesHash = await NewBlock.GetMsgsHash()
    return NewBlock
  } catch (err) {
    Debug(err.message)
    return null
  }
}
// create instance of Block with db data
// verify saved block hash, hash can only be correct of header is complete
const ParseBlockFromDb = async (blockObj) => {
  try {
    // remove database _id property from messages
    const messages = blockObj.Messages
      ? blockObj.Messages.map((msg) => ParseMessageFromDb(msg))
      : null

    const {
      PrevHash, Height, Nonce, Diff, Timestamp, Version, Hash,
    } = blockObj

    const ParsedBlock = await CreateBlock(PrevHash, Height, Nonce, Diff, messages, Timestamp, Version)
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
  } catch (err) {
    /* istanbul ignore next */
    // debugger
    Debug(err.message); return null
  }
}

//  is type of Block + header valid + all messages valid
const IsValidBlock = async (checkBlock) => {
  if (!(checkBlock instanceof Block)) {
    Debug('ERROR block is not of type Block (loaded from db without cast?)')
    return false
  }
  // header complete ?
  if (!IsHeaderComplete(checkBlock)) {
    Debug('ERROR block is not valid: header incomplete !')
    return false
  }

  // is the PoW valid ?
  const ValidPow = await CheckPoW(checkBlock.Diff, checkBlock.Hash)
  if (!ValidPow) {
    Debug('ERROR Proof-of-Work solution is not valid !')
    return false
  }

  // are all Messages valid ?
  if (checkBlock.Messages && checkBlock.Messages.length > 0) {
    const MessagesValid = await checkBlock.Messages.reduce(async (acc, msg) => {
      const msgValid = await IsMessageValid(msg)
      return await acc && msgValid
    }, true)

    return MessagesValid
  }
  return true
}
module.exports = {
  CheckPoW, CreateBlock, ParseBlockFromDb, IsValidBlock,
}
