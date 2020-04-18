const Debug = require('debug')('blockjs:address')
const { CalcHash, CreateKeys } = require('./crypt')
const { Cst } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

/*
// Load Public key, if not found: create new key pair
const GetPubPEMKey = async (KeyPath, KeyFile) => {
  try {
    const PublicKey = await ReadKey(KeyPath.concat(KeyFile))
    const PubPEM = ExportPublicPEM(PublicKey)
    return PubPEM
  } catch (err) {
    if (err.code === 'ENOENT') {
      Debug('Public key not found, creating (new) key pair')
      const NewKeys = await CreateKeys()
      const resultSave = await SaveKeys(NewKeys, KeyPath)

      if (!resultSave) {
        Debug('Cannot save new keys')
        return null
      }
      const key = await GetPubPEMKey(KeyPath, KeyFile)
      return key
    }

    return (err)
  }
}
*/

// Create new address from Public key, first make new key pair
const CreateAddress = async (db) => {
  try {
    const NewKeys = await CreateKeys()
    const { privateKey, publicKey } = NewKeys
    const PublicKeyHashed = await CalcHash(publicKey)
    const NewAddress = Cst.AddressPrefix.concat(PublicKeyHashed)
    // save address, public and private key in db as DER
    await db.Add(CstDocs.Address, {
      Address: NewAddress,
      PublicKey: (publicKey),
      PrivateKey: (privateKey),
    })
    return NewAddress
  } catch (error) {
    /* istanbul ignore next */
    Debug(error.message); return null
  }
}

// Get existing address or create new one
const Address = async (db) => {
  const address = await db.Find(CstDocs.Address, {})
  if (address && address.length !== 0) return address[0].Address
  // make new key's and an address
  const NewAddress = await CreateAddress(db)
  return NewAddress
}


module.exports = Address
