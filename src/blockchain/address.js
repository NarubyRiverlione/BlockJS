const Debug = require('debug')('blockjs:address')
const crypto = require('crypto')
// const eccrypto = require('eccrypto')

const { Cst } = require('../Const.js')

const { PrivateKeySize, Db: { Docs: CstDocs } } = Cst

const Address = async (db) => {
  const address = await db.Find(CstDocs.Address, {})
  if (address && address.length !== 0) return address[0].Address

  const newAddress = Cst.AddressPrefix.concat(crypto.randomBytes(PrivateKeySize).toString('hex'))
  try {
    await db.Add(CstDocs.Address, { Address: newAddress })
    return newAddress
  } catch (error) {
    Debug(error)
    return null
  }
}
/*
const CreateKeys = async (db) => {
  try {
    // A new random 32-byte private key.
    const PrivateKey = eccrypto.generatePrivate()
    // Corresponding uncompressed (65-byte) public key.
    const PublicKey = eccrypto.getPublic(PrivateKey)
    console.log(PrivateKey)
    console.log(PublicKey)
    await db.Add(CstDocs.Address, { PrivateKey, PublicKey })
  } catch (error) {
    Debug(error)
  }
}

const GetAddress = async (db) => {
  try {
    debugger
    const Keys = await db.Find(CstDocs.Address, {})
    debugger
    if (!Keys) {
      Debug('No Keys, creating them now..')
      await CreateKeys(db)
      //  return GetAddress(db)
    }
    const { PrivateKey, PublicKey } = Keys
    if (!PrivateKey) {
      Debug('No Private key !!')
      return null
    }
    if (!PublicKey) {
      Debug('No Public key !!')
      return null
    }

    const MyAddress = crypto.getHashes(PublicKey)
    return MyAddress
  } catch (error) {
    Debug(error)
    return null
  }
}
*/
module.exports = Address
