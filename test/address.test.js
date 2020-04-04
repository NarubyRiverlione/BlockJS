/* eslint-disable class-methods-use-this */
const rimraf = require('rimraf')

const Address = require('../src/blockchain/address')

const TestKeyPath = 'test/TestKeys/'
const TestPubKeyFile = 'pub.der'

const PubKeyPath = 'test/'
const PubKeyFile = 'TestPub.der'
const TestAddress = 'SPICE_80294479e60afb19c1561440bd4a4982e513ea44591494e5486b236192209467'

afterAll((done) => {
  rimraf('test/TestKeys', () => done())
})

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

it('Get address from db with no saved address => generate from Public key', async () => {
  const db = new DummyDbWithoutAddress()
  const MyAddress = await Address(db, PubKeyPath, PubKeyFile)
  expect(MyAddress).not.toBeNull()
  expect(MyAddress).toBe(TestAddress)
})

it('Get address from db with no saved address and no Public key => generate keys', async () => {
  const db = new DummyDbWithoutAddress()
  const MyAddress = await Address(db, TestKeyPath, TestPubKeyFile)
  expect(MyAddress).not.toBeNull()
})


it('Get address from db', async () => {
  const db = new DummyDbWithAddress()
  const MyAddress = await Address(db)
  expect(MyAddress).toBe(TestAddress)
})
