/* eslint-disable class-methods-use-this */
const { GetAddress } = require('../src/blockchain/address')

const TestPrivKey = 'aa'
const TestPublicKey = 'bbb'
const TestAddress = 'ccc'

class DummyDbWithoutKeys {
  Find() { return Promise.resolve(null) }
}

class DummyDbWithKeys {
  Find() {
    return Promise.resolve(
      { PrivateKey: TestPrivKey, PublicKey: TestPublicKey },
    )
  }
}

it.skip('Get address from db withou keys => generate keys now ', async () => {
  debugger
  const db = new DummyDbWithoutKeys()
  const MyAddress = await GetAddress(db)
  expect(MyAddress).not.toBeNull()
})


it.skip('Get address from db', async () => {
  const db = new DummyDbWithKeys()
  const MyAddress = await GetAddress(db)
  expect(MyAddress).toBe(TestAddress)
})
