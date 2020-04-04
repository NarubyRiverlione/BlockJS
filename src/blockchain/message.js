/* Message: From, Hash (from+content) */
const Debug = require('debug')('blockjs:message')
const {
  CreateSignature, VerifySignature, ConvertPubKey, CalcHash,
  ExportPublicDER, ExportPublicPEM,
} = require('./crypt')

const { Cst, CstError } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

class Message {
  constructor(fromAddress, hash, id = null, signature = null, pubKey = null) {
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

  Sign(PrivateKey, PublicKey) {
    const Sig = CreateSignature(this.Hash, PrivateKey)
    this.Signature = Sig
    this.PublicKey = PublicKey
  }

  Verify() {
    const Pub = ExportPublicPEM(this.PublicKey)
    return VerifySignature(this.Hash, this.Signature, Pub)
  }
}

const CreateMessage = async (fromAddress, content, id) => {
  try {
    // make a dummy message without hash to calculate... the hash
    const MsgWithoutHash = new Message(fromAddress, null, id)
    const MsgHash = await MsgWithoutHash.GetMsgHash(content)
    // unsigned message
    const UnsignedMsg = new Message(fromAddress, MsgHash, id)
    return UnsignedMsg
  } catch (err) {
    /* istanbul ignore next */
    Debug(err.message); return null
  }
}


// remove database _id property from messages
const ParseMessageFromDb = (messageObj) => {
  const {
    From, Hash, Id, Signature, PublicKey,
  } = messageObj

  if (PublicKey.buffer) {
    const Pub = ConvertPubKey(PublicKey.buffer)
    return new Message(From, Hash, Id, Signature, Pub)
  }
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
