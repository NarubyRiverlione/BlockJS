/* eslint-disable class-methods-use-this */
const rimraf = require('rimraf')
const crypt = require('../src/blockchain/crypt')

const CstTestPriv = 'TestPriv.key'
const CstTestPub = 'TestPub.pem'
const CstTestKeyDir = 'test/'
const PrivKeyPath = CstTestKeyDir.concat(CstTestPriv)
const PubKeyPath = CstTestKeyDir.concat(CstTestPub)
const TestMsg = 'Hello World !'

afterAll((done) => {
  rimraf('test/TestKeys', () => done())
})

it('Create Keys', async () => {
  const result = await crypt.CreateKeys()
  expect(result).not.toBeNull()
  expect(result.privateKey).not.toBeNull()
  expect(result.publicKey).not.toBeNull()
})

it('Save new created keys', async () => {
  const Keys = await crypt.CreateKeys()
  expect(Keys).not.toBeNull()
  const result = await crypt.SaveKeys(Keys, 'test/TestKeys/')
  expect(result).toBeTruthy()
})
it.skip('Save new created keys in new directory', async () => {
  const Keys = await crypt.CreateKeys()
  expect(Keys).not.toBeNull()
  const DifferentPath = 'test/TestKeys/'.concat(Date.now())
  const result = await crypt.SaveKeys(Keys, DifferentPath)
  expect(result).toBeTruthy()
})

it('Read saved Test keys', async () => {
  const PrivateKey = await crypt.ReadKey(PrivKeyPath)
  expect(PrivateKey).not.toBeNull()
  const PublicKey = await crypt.ReadKey(PubKeyPath)
  expect(PublicKey).not.toBeNull()
})
it('Get no-existing key', async () => {
  try {
    await crypt.ReadKey('dummy')
  } catch (err) {
    expect(err).not.toBeNull()
  }
})

it('Sign message with Test key', async () => {
  const PrivateKey = await crypt.ReadKey(PrivKeyPath)
  expect(PrivateKey).not.toBeNull()

  const signature = await crypt.CreateSignature(TestMsg, PrivateKey)
  expect(signature).not.toBeNull()
})
it('Cannot sign message without private key', async () => {
  const signature = await crypt.CreateSignature(TestMsg, null)
  expect(signature).toBeNull()
})


it('Verify signed message; OK', async () => {
  const Priv = await crypt.ReadKey(PrivKeyPath)
  expect(Priv).not.toBeNull()

  const Sig = await crypt.CreateSignature(TestMsg, Priv)
  expect(Sig).not.toBeNull()

  const Pub = await crypt.ReadKey(PubKeyPath)
  expect(Pub).not.toBeNull()

  const result = await crypt.VerifySignature(TestMsg, Sig, Pub)
  expect(result).not.toBeNull()
  expect(result).toBeTruthy()
})
it('Verify signed message; not ok', async () => {
  const Priv = await crypt.ReadKey(PrivKeyPath)
  expect(Priv).not.toBeNull()

  const Sig = 'DUMMY SIG'
  expect(Sig).not.toBeNull()

  const Pub = await crypt.ReadKey(PubKeyPath)
  expect(Pub).not.toBeNull()

  const result = await crypt.VerifySignature(TestMsg, Sig, Pub)
  expect(result).not.toBeNull()
  expect(result).not.toBeTruthy()
})

it('Cannot verify without signature', async () => {
  const result = await crypt.VerifySignature(TestMsg, null, null)
  expect(result).toBeNull()
})
it('Cannot verify without public key', async () => {
  const result = await crypt.VerifySignature(TestMsg, 'dummy', null)
  expect(result).toBeNull()
})

it('Calc Hash', async () => {
  const Hash = await crypt.CalcHash(TestMsg)
  expect(Hash).toBe('07f2bdef34ed16e3a1ba0dbb7e47b8fd981ce0ccb3e1bfe564d82c423cba7e47')
})
