const SHA256 = require('crypto-js/sha256')
const Debug = require('debug')('blockjs:message')
const CstDocs = require('./const').Db.Docs

class Message {
  constructor(fromAddress, content) {
    this.From = fromAddress
    this.Content = content
    this.TXhash = this.Hash()
  }

  Hash() {
    const hash = SHA256(this.From + this.Content)
    return hash.toString()
  }
  static ParseFromDb(msgDb) {
    const msg = new Message(
      msgDb.From,
      msgDb.Message,
    )
    return msg
  }
  static IsValid(msg) {
    if (!(msg instanceof Message)) {
      Debug('msg is not of type Message (loaded from db without cast?)')
      return false
    }
    if (!msg.FromAddress) {
      Debug('ERROR message is not valid: no from address')
      return false
    }
    if (!msg.Content) {
      Debug('ERROR message is not valid: no content')
      return false
    }
    return true
  }

  // save to db
  Save(db) {
    return db.Add(CstDocs.PendingMessages, this)
  }
}

module.exports = Message
