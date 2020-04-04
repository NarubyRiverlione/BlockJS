const Debug = require('debug')('blockjs:address')
const {
  ReadKey, CalcHash, CreateKeys, SaveKeys, ExportPublicPEM,
} = require('./crypt')
const { Cst } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

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
      /* istanbul ignore next */
      if (!resultSave) {
        Debug('Cannot save new keys')
        return null
      }
      const key = await GetPubPEMKey(KeyPath, KeyFile)
      return key
    }
    /* istanbul ignore next */
    return (err)
  }
}

// Load address from db, if not found create from Public key
const CreateAddress = async (db, KeyPath, KeyFile) => {
  try {
    const PublicKey = await GetPubPEMKey(KeyPath, KeyFile)
    const PublicKeyHashed = await CalcHash(PublicKey)
    const NewAddress = Cst.AddressPrefix.concat(PublicKeyHashed)
    await db.Add(CstDocs.Address, { Address: NewAddress })
    return NewAddress
  } catch (error) {
    /* istanbul ignore next */
    Debug(error.message); return null
  }
}

// Get existing address or create new one
const Address = async (db, KeyPath, PubKeyFile) => {
  const address = await db.Find(CstDocs.Address, {})
  if (address && address.length !== 0) return address[0].Address
  // make new key's and an address
  const NewAddress = await CreateAddress(db, KeyPath, PubKeyFile)
  return NewAddress
}


module.exports = Address
