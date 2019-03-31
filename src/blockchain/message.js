/* Message: From, Hash (from+content) */
const Debug = require('debug')('blockjs:message')
// const cryptoAsync = require('@ronomon/crypto-async')

const { Cst, CstError } = require('../Const.js')
const { CalcHash } = require('./crypt')

const { Db: { Docs: CstDocs } } = Cst

class Message {
  constructor(fromAddress, hash, signature, pubKey, id = null) {
    this.From = fromAddress
    this.Id = id
    this.Hash = hash
    this.Signature = signature
    this.PublicKey = pubKey
  }

  async GetMsgHash(content) {
    try {
      const { Id, From } = this
      const hashContent = Id ? From + content + Id : From + content
      const MsgHash = await CalcHash(hashContent)
      return MsgHash
    } catch (err) {
      /* istanbul ignore next */
      return null
    }
  }

  Save(db) {
    return db.Add(CstDocs.PendingMessages, this)
  }
}

const CreateMessage = async (fromAddress, content, signature, pubKey, id) => {
  try {
    // make a dummy message without hash to calculate... the hash
    const MsgWithoutHash = new Message(fromAddress, null, signature, pubKey, id)
    const MsgHash = await MsgWithoutHash.GetMsgHash(content)
    return new Message(fromAddress, MsgHash, signature, pubKey, id)
  } catch (err) {
    /* istanbul ignore next */
    Debug(err.message); return null
  }
}

// remove database _id property from messages
const ParseMessageFromDb = (messageObj) => {
  const { From, Hash, Id } = messageObj
  return new Message(From, Hash, Id)
}

const IsMessageValid = async (msg, content = null) => {
  if (!(msg instanceof Message)) {
    Debug(new Error('Not of type Message (loaded from db without cast?)'))
    return false
  }

  if (!msg.From) { Debug(CstError.MsgNoFrom); return false }

  if (content) {
    const checkHash = await msg.GetMsgHash(content)
    if (msg.Hash !== checkHash) { Debug(CstError.msgHashInvalid); return false }
  }
  return true
}

module.exports = { CreateMessage, IsMessageValid, ParseMessageFromDb }
