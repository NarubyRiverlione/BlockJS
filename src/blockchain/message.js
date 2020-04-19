/* Message: From, Hash (from+content) */
const Debug = require('debug')('blockjs:message')
const {
  CreateSignature, VerifySignature, ConvertPubKey, CalcHash, ExportPublicDER, ReadPrivateKey, ReadPublicKey,
} = require('./crypt')

const { Cst, CstError } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

class Message {
  /*
   Public key is stored in DER format
   Constructor converts if needed
  */
  constructor(fromAddress, msghash, pub, signature = null) {
    this.From = fromAddress
    this.Hash = msghash
    this.Signature = signature

    if (pub.buffer) {
      // already in DER
      this.PublicKey = pub
    } else if (typeof pub === 'string' || pub instanceof String) {
      // in string (hex) format, convert to DER
      const pubKey = Buffer.from(pub, 'utf8')
      this.PublicKey = pubKey
    } else {
      // pub is a KeyObject, convert it now to DER before adding it to the message
      const PublicDER = ExportPublicDER(pub)
      this.PublicKey = PublicDER
    }
  }

  Save(db) {
    return db.Add(CstDocs.PendingMessages, this)
  }

  // sign this message with the private KeyObj for a specific address
  async Sign(address, db) {
    // read private key for this address
    const PrivateKeyObj = await ReadPrivateKey(address, db)

    const Sig = CreateSignature(this.Hash, PrivateKeyObj)
    this.Signature = Sig
  }

  Verify() {
    //  verify signature works with public key in KeyObject format,
    // convert it now from  DER
    const PublicKeyObj = ConvertPubKey(this.PublicKey)
    return VerifySignature(this.Hash, this.Signature, PublicKeyObj)
  }
}


const CreateMessage = async (fromAddress, content, db) => {
  const pubKey = await ReadPublicKey(fromAddress, db)
  const msgHash = await CalcHash(content)
  const message = new Message(fromAddress, msgHash, pubKey)
  await message.Sign(fromAddress, db)
  return message
}

// remove database _id property from messages
const ParseMessageFromDb = (messageObj) => {
  const {
    From, Hash, Signature, PublicKey,
  } = messageObj
  // Public key is stored in DER
  return new Message(From, Hash, PublicKey, Signature)
}

const IsMessageValid = async (msg, content = null) => {
  if (!(msg instanceof Message)) {
    Debug(new Error('Not of type Message (loaded from db without cast?)'))
    return false
  }

  if (!msg.From) { Debug(CstError.MsgNoFrom); return false }

  if (content) {
    // check message hash
    const checkHash = await msg.GetMsgHash(content)
    if (msg.Hash !== checkHash) { Debug(CstError.msgHashInvalid); return false }
    // check message signature
    const verified = await this.Verify()
    if (!verified) { Debug(CstError.MsgSignatureInvalid); return false }
  }
  return true
}

const CreateGenesisMsg = async () => {
  const GenesisPubKey = Buffer.from(Cst.GenesisPubKey, 'utf8')
  const msgHash = await CalcHash(Cst.GenesisMsg)
  return new Message(Cst.GenesisAddress, msgHash, GenesisPubKey, Cst.GenesisSignature)
}

module.exports = {
  CreateMessage, IsMessageValid, ParseMessageFromDb, CreateGenesisMsg,
}
