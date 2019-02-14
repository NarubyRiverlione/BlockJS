/* Message: From, Hash (from+content) */

const SHA256 = require('crypto-js/sha256')
const { Cst } = require('./const.js')

const { Db: { Docs: CstDocs } } = Cst

const msgHash = (fromAddress, content) => SHA256(fromAddress + content).toString()

class Message {
  constructor(fromAddress, hash) {
    this.From = fromAddress
    this.Hash = hash
  }

  static CreateFromContent(fromAddress, content) {
    return new Message(fromAddress, msgHash(fromAddress, content))
  }

  static IsValid(msg, content = null) {
    return new Promise((resolve, reject) => {
      // if (!(msg instanceof Message)) {
      //   return reject(new Error('Not of type Message (loaded from db without cast?)'))
      // }
      if (!msg.From) {
        return reject(new Error('ERROR message is not valid: no from address'))
      }
      if (content) {
        const checkHash = msgHash(msg.From, content)
        if (msg.Hash !== checkHash) {
          return reject(new Error('ERROR message hash is not valid for content'))
        }
      }
      return resolve(true)
    })
  }

  // remove database _id property from messages
  static ParseFromDb(msg) {
    return new Message(msg.From, msg.Hash)
  }

  Save(db) {
    return db.Add(CstDocs.PendingMessages, this)
  }
}

module.exports = Message
