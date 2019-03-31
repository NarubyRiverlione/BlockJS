const Debug = require('debug')('blockjs:address')
const { GetKey, CreateKeys } = require('./crypt')
const { Cst } = require('../Const.js')

const { PrivateKeySize, Db: { Docs: CstDocs } } = Cst


const CreateAddress = async (db) => {
  await CreateKeys()
  const PublicKey = await GetKey(db, Cst.PublicKey)
  const PrivateKey = await GetKey(db, Cst.PrivateKey)

  const NewAddress = Cst.AddressPrefix.concat(PublicKey)
  try {
    await db.Add(CstDocs.Address, { Address: NewAddress, PublicKey, PrivateKey })
    return NewAddress
  } catch (error) {
    Debug(error)
    return null
  }
}

const Address = async (db) => {
  const address = await db.Find(CstDocs.Address, {})
  if (address && address.length !== 0) return address[0].Address
  // make new key's and an address
  return CreateAddress()
}


module.exports = Address
