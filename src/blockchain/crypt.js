const fs = require('fs')
const cryptoAsync = require('@ronomon/crypto-async')
const crypto = require('crypto')
const Debug = require('debug')('blockjs:cryp')

const { Cst } = require('../Const')

// convert Public DER key to KeyObject
const ConvertPubKey = (DERkey) => {
  const Pub = crypto.createPublicKey({ key: DERkey, format: 'der', type: 'spki' })
  return Pub
}

// Export public key to PEM
const ExportPublicPEM = (Pub) => (
  Pub.export({ format: 'pem', type: 'spki' })
)
const ExportPublicDER = (Pub) => (
  Pub.export({ format: 'der', type: 'spki' })
)
// convert Private DER key to KeyObject
const ConvertPrivKey = (DERkey) => {
  const Priv = crypto.createPrivateKey({ key: DERkey, format: 'der', type: 'pkcs8' })
  return Priv
}

const WriteKey = (path, key) => (
  new Promise((resolve, reject) => {
    fs.writeFile(path, key,
      (err) => {
        /* istanbul ignore next */
        if (err) return reject(err)
        return resolve()
      })
  })
)

const ReadKey = (path) => (
  new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        Debug(err.message)
        return reject(err)
      }

      if (path.includes('.der')) {
        const Pub = ConvertPubKey(data)
        return resolve(Pub)
      }
      if (path.includes('.key')) {
        const Priv = ConvertPrivKey(data)
        return resolve(Priv)
      }
      if (path.includes('.pem')) {
        return resolve(data)
      }
      Debug('Unknown key type')

      return reject()
    })
  })
)
const CheckPath = (path) => (
  new Promise((resolve, reject) => {
    fs.stat(path, (err) => {
      if (err) {
        Debug(err.message)
        return reject(err)
      }
      /* istanbul ignore next */
      return resolve(true)
    })
  })
)

const CheckAndCreatePath = (path) => (
  new Promise((resolve, reject) => {
    CheckPath(path)
      .then(() => resolve(true))

      .catch((err) => {
        if (err && err.code === 'ENOENT') {
          // Create dir in case not found
          fs.mkdir(path, { recursive: true },
            (errMkDir) => {
              if (errMkDir) return reject(errMkDir)
              return resolve(true)
            })
        } else {
          /* istanbul ignore next */
          return reject(err)
        }
      })
  })
)

const CalcHash = (content) => new Promise((resolve, reject) => {
  const source = Buffer.from(content, 'utf8')
  cryptoAsync.hash(Cst.HashAlgorithm, source,
    (error, hash) => {
      if (error) { return reject(error) }
      return resolve(hash.toString('hex'))
    })
})

const SaveKeys = async (Keys, KeyPath) => {
  try {
    const PathOk = await CheckAndCreatePath(KeyPath)
    if (!PathOk) return false

    const { privateKey, publicKey } = Keys
    if (privateKey) { await WriteKey(KeyPath.concat(Cst.PrivFile), privateKey) }
    if (publicKey) { await WriteKey(KeyPath.concat(Cst.PubFile), publicKey) }
    return true
  } catch (err) {
    /* istanbul ignore next */
    return false
  }
}

const CreateKeys = async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'sect239k1',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  })

  return { privateKey, publicKey }
}


const CreateSignature = (payload, Privatekey) => {
  if (!Privatekey) {
    Debug('Cannot sign without the Private Key !!')
    return null
  }

  const sign = crypto.createSign('SHA256')
  sign.write(payload)
  sign.end()

  // const Priv = crypto.createPrivateKey({ key: Privatekey, format: 'der', type: 'pkcs8' })
  const Signature = sign.sign(Privatekey, 'hex')
  return Signature
}

const VerifySignature = (payload, signature, publicKey) => {
  if (!signature) {
    Debug('Cannot verify without the signature')
    return null
  }
  if (!publicKey) {
    Debug('Cannot verify without the Public key')
    return null
  }
  //  const PublicPEM = ConvertPubKey(publicKey)

  const verify = crypto.createVerify('SHA256')
  verify.write(payload)
  verify.end()
  return verify.verify(publicKey, signature, 'hex')
}

module.exports = {
  CreateSignature,
  VerifySignature,
  CalcHash,
  ReadKey,
  CreateKeys,
  SaveKeys,
  ExportPublicPEM,
  ExportPublicDER,
  ConvertPubKey,

}
