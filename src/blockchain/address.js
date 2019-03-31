const Debug = require('debug')('blockjs:address')
const {
  ReadKey, CalcHash, CreateKeys, SaveKeys,
} = require('./crypt')
const { Cst } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

// Load Public key, if not found: create new key pair
const GetPubKey = async (KeyDir) => {
  try {
    const PublicKey = await ReadKey(KeyDir)
    if (PublicKey) return PublicKey

    Debug('Public key not found, creating (new) key pair')
    const NewKeys = await CreateKeys()
    await SaveKeys(NewKeys, KeyDir)
    return GetPubKey(KeyDir)
  } catch (err) { return (err) }
}

// Load address from db, if not found create from Public key
const CreateAddress = async (db, KeyDir) => {
  try {
    const PublicKey = await GetPubKey(KeyDir)
    const PublicKeyHashed = await CalcHash(PublicKey)
    const NewAddress = Cst.AddressPrefix.concat(PublicKeyHashed)
    await db.Add(CstDocs.Address, { Address: NewAddress })
    return NewAddress
  } catch (error) {
    Debug(error.message)
    return null
  }
}

// Get existing address or create new one
const Address = async (db, KeyDir) => {
  const address = await db.Find(CstDocs.Address, {})
  if (address && address.length !== 0) return address[0].Address
  // make new key's and an address
  const NewAddress = await CreateAddress(db, KeyDir)
  return NewAddress
}


module.exports = Address
