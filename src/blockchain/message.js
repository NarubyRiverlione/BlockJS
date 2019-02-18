/* Message: From, Hash (from+content) */
const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:message')

const { Cst, CstError } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

const msgHash = (fromAddress, content) => SHA256(fromAddress + content).toString()

class Message {
  constructor(fromAddress, hash, id = null) {
    this.From = fromAddress
    this.Hash = hash
    this.Id = id
  }

  static Create(fromAddress, content, id) {
    const MsgHash = msgHash(fromAddress, content, id)
    return new Message(fromAddress, MsgHash, id)
  }

  static IsValid(msg, content = null) {
    // if (!(msg instanceof Message)) {
    //   return reject(new Error('Not of type Message (loaded from db without cast?)'))
    // }
    if (!msg.From) { Debug(CstError.MsgNoFrom); return false }
    if (content) {
      const checkHash = msgHash(msg.From, content)
      if (msg.Hash !== checkHash) { Debug(CstError.msgHashInvalid); return false }
    }
    return true
  }


  // remove database _id property from messages
  static ParseFromDb(messageObj) {
    const { From, Hash, Id } = messageObj
    return new Message(From, Hash, Id)
  }

  Save(db) {
    return db.Add(CstDocs.PendingMessages, this)
  }
}

module.exports = Message
