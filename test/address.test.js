/* eslint-disable class-methods-use-this */
const Address = require('../src/blockchain/address')

// const CstTestPriv = 'TestPriv.key'
const CstTestPub = 'TestPub.pem'
const CstTestKeyDir = 'test/'
const PubKeyPath = CstTestKeyDir.concat(CstTestPub)
const TestAddress = 'Azerty'

class DummyDbWithoutAddress {
  Find() { return Promise.resolve(null) }

  Add() { return Promise.resolve() }
}

class DummyDbWithAddress {
  Find() {
    return Promise.resolve(
      [{ Address: TestAddress }],
    )
  }
}

it('Get address from db without address => generate keys now ', async () => {
  const db = new DummyDbWithoutAddress()
  const MyAddress = await Address(db, PubKeyPath)
  expect(MyAddress).not.toBeNull()
})


it('Get address from db', async () => {
  const db = new DummyDbWithAddress()
  const MyAddress = await Address(db)
  expect(MyAddress).toBe(TestAddress)
})
