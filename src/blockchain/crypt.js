const cryptoAsync = require('@ronomon/crypto-async')
const crypto = require('crypto')
const Debug = require('debug')('blockjs:cryp')

const { Cst } = require('../Const')

const { Db: { Docs: CstDocs } } = Cst

// convert Public DER key to KeyObject
const ConvertPubKey = (DERkey) => {
  const PublicKeyObj = crypto.createPublicKey({
    key: DERkey.buffer ? DERkey.buffer : DERkey,
    format: 'der',
    type: 'spki',
  })
  return PublicKeyObj
}
// convert Private DER key to KeyObject
const ConvertPrivKey = (DERkey) => {
  const PrivateKeyObj = crypto.createPrivateKey({
    key: DERkey.buffer ? DERkey.buffer : DERkey,
    format: 'der',
    type: 'pkcs8',
  })
  return PrivateKeyObj
}

// Export public KeyObj to DER
const ExportPublicDER = (PublicKeyObj) => (
  PublicKeyObj.export({ format: 'der', type: 'spki' })
)

// Export private KeyObj to DER
const ExportPrivateDER = (PrivateKeyObj) => (
  PrivateKeyObj.export({ format: 'der', type: 'pkcs8' })
)

const ReadPublicKey = async (address, db) => {
  try {
    const foundDbAddresses = await db.Find(CstDocs.Address, { Address: address })
    if (foundDbAddresses && foundDbAddresses.length !== 0) {
      const pubDER = foundDbAddresses[0].PublicKey
      const PublicKeyObj = ConvertPubKey(pubDER)
      return Promise.resolve(PublicKeyObj)
    }
    return Promise.reject(new Error(`Cannot find public key in database for address ${address}`))
  } catch (err) {
    return Promise.reject(err)
  }
}

const ReadPrivateKey = async (address, db) => {
  try {
    const foundDbAddresses = await db.Find(CstDocs.Address, { Address: address })
    if (foundDbAddresses && foundDbAddresses.length !== 0) {
      const privDER = foundDbAddresses[0].PrivateKey
      const privateKeyObj = ConvertPrivKey(privDER)
      return Promise.resolve(privateKeyObj)
    }
    return Promise.reject(new Error(`Cannot find private key in database for address ${address}`))
  } catch (err) { return Promise.reject(err) }
}


const CalcHash = (content) => (
  new Promise((resolve, reject) => {
    const source = Buffer.from(content, 'utf8')
    cryptoAsync.hash(Cst.HashAlgorithm, source,
      (error, hash) => {
        if (error) {
          return reject(error)
        }
        return resolve(hash.toString('hex'))
      })
  })
)

// create private & public keypair, returns KeyObjects
const CreateKeys = async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'sect239k1',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  })

  return { privateKey, publicKey }
}


const CreateSignature = (payload, PrivateKeyObj) => {
  if (!PrivateKeyObj) {
    Debug('Cannot sign without the Private Key !!')
    return null
  }

  const sign = crypto.createSign('SHA256')
  sign.write(payload)
  sign.end()

  // const Priv = crypto.createPrivateKey({ key: Privatekey, format: 'der', type: 'pkcs8' })
  const Signature = sign.sign(PrivateKeyObj, 'hex')
  return Signature
}

const VerifySignature = (payload, signature, publicKeyObj) => {
  if (!signature) {
    Debug('Cannot verify without the signature')
    return null
  }
  if (!publicKeyObj) {
    Debug('Cannot verify without the Public key')
    return null
  }
  //  const PublicPEM = ConvertPubKey(publicKey)

  const verify = crypto.createVerify('SHA256')
  verify.write(payload)
  verify.end()
  return verify.verify(publicKeyObj, signature, 'hex')
}

module.exports = {
  CreateSignature,
  VerifySignature,
  CalcHash,
  ReadPublicKey,
  ReadPrivateKey,
  CreateKeys,
  ExportPublicDER,
  ExportPrivateDER,
  ConvertPubKey,
}
