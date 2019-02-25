/* eslint-disable class-methods-use-this */
const Message = require('../src/blockchain/Message.js')
const { Cst } = require('../src/Const')

const { Db: { Docs: CstDocs } } = Cst

const TestContent = 'Test message'
const TestFromAddress = 'Azerty123456789'
const TestHashWithoutId = '53f93f273c38a9c4e43d313122cf84508f86e13d009073ddf754788b95034abc'
const TestId = '12345'
const TestHashWithId = '53f93f273c38a9c4e43d313122cf84508f86e13d009073ddf754788b95034abc'

class DummyDb {
  Add(collection, data) {
    if (collection === CstDocs.PendingMessages && data) return Promise.resolve(true)
    return Promise.reject()
  }
}

it('Create a message, without Id', () => {
  const Msg = Message.Create(TestFromAddress, TestContent)
  expect(Msg).not.toBeNull()
  expect(Msg.Hash).toBe(TestHashWithoutId)
  expect(Msg.From).toBe(TestFromAddress)
})
it('Create a message, with Id', () => {
  const Msg = Message.Create(TestFromAddress, TestContent, TestId)
  expect(Msg).not.toBeNull()
  expect(Msg.Hash).toBe(TestHashWithId)
  expect(Msg.From).toBe(TestFromAddress)
  expect(Msg.Id).toBe(TestId)
})

it('Validated correct message ', () => {
  const Msg = Message.Create(TestFromAddress, TestContent)
  expect(Message.IsValid(Msg, TestContent)).toBeTruthy()
})

it('Validated message without from address', () => {
  const MsgWithoutFromAddress = new Message(null, TestContent)
  expect(MsgWithoutFromAddress.From).toBeNull()
  expect(Message.IsValid(MsgWithoutFromAddress)).toBeFalsy()
})

it('Validated message with wrong hash', () => {
  const MsgWrongHash = new Message(TestFromAddress, TestContent)
  MsgWrongHash.Hash = 'ThisIsAWrongHash'
  expect(Message.IsValid(MsgWrongHash, TestContent)).toBeFalsy()
})

it('Parse from db: remove extra property', () => {
  const DbMsg = {
    From: TestFromAddress,
    Hash: TestHashWithoutId,
    _id: 'DatabaseID',
  }
  expect(Message.IsValid(DbMsg)).toBeTruthy()
  const ParsedMsg = Message.ParseFromDb(DbMsg)
  expect(Message.IsValid(ParsedMsg)).toBeTruthy()
  expect(ParsedMsg._id).toBeUndefined()
})

it('Save to dummy db', async () => {
  const Msg = Message.Create(TestFromAddress, TestContent)
  expect(Msg).not.toBeNull()
  const db = new DummyDb()
  const result = await Msg.Save(db)
  expect(result).toBeTruthy()
})