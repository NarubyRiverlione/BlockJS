const fs = require('fs')
const cryptoAsync = require('@ronomon/crypto-async')
const crypto = require('crypto')
const Debug = require('debug')('blockjs:cryp')

const { Cst } = require('../Const')

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

const ReadKey = path => (
  new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      /* istanbul ignore next */
      if (err) return reject(err)
      return resolve(data)
    })
  })
)
const CheckPath = path => (
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

const CheckAndCreatePath = path => (
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


const CalcHash = content => new Promise((resolve, reject) => {
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
/*
const ReadKeys = async (KeyPath) => {
  try {
    const privateKey = await ReadKey(KeyPath.concat(Cst.PrivFile))
    const publicKey = await ReadKey(KeyPath.concat(Cst.PubFile))
    return { privateKey, publicKey }
  } catch (err) {
    Debug(err.message)
    return null
  }
}
*/

const CreateKeys = async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'sect239k1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  return { privateKey, publicKey }
}


const GetKey = async (KeyFile, KeyPath) => {
  const Key = await ReadKey(KeyPath.concat(KeyFile))
  return Key
}

const CreateSignature = async (payload, Privatekey) => {
  if (!Privatekey) {
    Debug('Cannot sign without the Private Key !!')
    return null
  }

  const sign = crypto.createSign('SHA256')
  sign.write(payload)
  sign.end()

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
  const verify = crypto.createVerify('SHA256')
  verify.write(payload)
  verify.end()
  return verify.verify(publicKey, signature, 'hex')
}

module.exports = {
  CreateSignature, VerifySignature, CalcHash, GetKey, CreateKeys, SaveKeys,
}
