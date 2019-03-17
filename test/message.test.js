/* eslint-disable class-methods-use-this */
const { CreateMessage, IsMessageValid, ParseMessageFromDb } = require('../src/blockchain/message.js')
const { Cst } = require('../src/Const')

const { Db: { Docs: CstDocs } } = Cst

const TestContent = 'Test message'
const TestFromAddress = 'Azerty123456789'
const TestHashWithoutId = '53f93f273c38a9c4e43d313122cf84508f86e13d009073ddf754788b95034abc'
const TestId = '12345'
const TestHashWithId = 'a6111c58baedfcdfdc470f23daa6a46d0c06b14587c28866992db0818ee61321'

class DummyDb {
  Add(collection, data) {
    if (collection === CstDocs.PendingMessages && data) return Promise.resolve(true)
    return Promise.reject()
  }
}

it('Create a message, without Id', async () => {
  const Msg = await CreateMessage(TestFromAddress, TestContent)
  expect(Msg).not.toBeNull()
  expect(Msg.Hash).toBe(TestHashWithoutId)
  expect(Msg.From).toBe(TestFromAddress)
})
it('Create a message, with Id', async () => {
  const Msg = await CreateMessage(TestFromAddress, TestContent, TestId)
  expect(Msg).not.toBeNull()
  expect(Msg.Hash).toBe(TestHashWithId)
  expect(Msg.From).toBe(TestFromAddress)
  expect(Msg.Id).toBe(TestId)
})

it('Validated correct message ', async () => {
  const Msg = await CreateMessage(TestFromAddress, TestContent)
  expect(IsMessageValid(Msg, TestContent)).toBeTruthy()
})

it('Validated message without from address', async () => {
  const MsgWithoutFromAddress = await CreateMessage(null, TestContent)
  expect(MsgWithoutFromAddress.From).toBeNull()
  const Valid = await IsMessageValid(MsgWithoutFromAddress, TestContent)
  expect(Valid).toBeFalsy()
})

it('Validated message with wrong hash', async () => {
  const MsgWrongHash = await CreateMessage(TestFromAddress, TestContent)
  MsgWrongHash.Hash = 'ThisIsAWrongHash'
  const Valid = await IsMessageValid(MsgWrongHash, TestContent)
  expect(Valid).toBeFalsy()
})

it('Parse from db: remove extra property', () => {
  const DbMsg = {
    From: TestFromAddress,
    Hash: TestHashWithoutId,
    _id: 'DatabaseID',
  }
  expect(IsMessageValid(DbMsg)).toBeTruthy()
  const ParsedMsg = ParseMessageFromDb(DbMsg)
  expect(IsMessageValid(ParsedMsg)).toBeTruthy()
  expect(ParsedMsg._id).toBeUndefined()
})

it('Save to dummy db', async () => {
  const Msg = await CreateMessage(TestFromAddress, TestContent)
  expect(Msg).not.toBeNull()
  const db = new DummyDb()
  const result = await Msg.Save(db)
  expect(result).toBeTruthy()
})

it('Calculating msg hash failed', async () => {
  const Msg = await CreateMessage(TestFromAddress, TestContent)
  expect(Msg).not.toBeNull()
  expect(Msg.Hash).toBe(TestHashWithoutId)
  expect(Msg.From).toBe(TestFromAddress)
})
