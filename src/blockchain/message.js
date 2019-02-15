/* Message: From, Hash (from+content) */
const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:message')

const { Cst, CstError } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

const msgHash = (fromAddress, content) => SHA256(fromAddress + content).toString()

class Message {
  constructor(fromAddress, hash) {
    this.From = fromAddress
    this.Hash = hash
  }

  static Create(fromAddress, content) {
    return new Message(fromAddress, msgHash(fromAddress, content))
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
    return new Message(messageObj.From, messageObj.Hash)
  }

  Save(db) {
    return db.Add(CstDocs.PendingMessages, this)
  }
}

module.exports = Message
