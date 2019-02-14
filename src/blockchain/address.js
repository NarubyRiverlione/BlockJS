const { Cst } = require('./const.js')
const crypto = require('crypto')

const Debug = require('debug')('blockjs:address')


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

module.exports = Address
