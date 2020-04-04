p/* eslint-disable class-methods-use-this */
const Mining = require('./blockchain/mining')
const Message = require('./blockchain/message')
const { Cst, CstError } = require('../src/Const')

const { Db: { Docs: CstDocs } } = Cst

const TestContent = 'Test message'
const TestContent2 = '2th Test message'
const TestFromAddress = 'Azerty123456789'

const MakeTestMessages = async () => {
  const TestMsg = await Message.Create(TestFromAddress, TestContent)
  const TestMsg2 = await Message.Create(TestFromAddress, TestContent2)
  return [TestMsg]
}

const NotBlock = {
  PrevHash: 12,
  Height: 1555,
  Diff: 1,
  Version: 1,
  Messages: null,
  Hash: '',
}


class DummyDb {
  async Find(doc) {
    if (doc === CstDocs.PendingMessages) {
      const pendingMessages = await MakeTestMessages()
      return Promise.resolve(pendingMessages)
    }
    return Promise.reject()
  }

  Add() { return Promise.resolve(true) }

  RemoveAllDocs() { return Promise.resolve(true) }
}

class DummyP2P {
  Broadcast() { }
}

class DummyBlockchain {
  constructor(syncNeeded = false) {
    this.Db = new DummyDb()
    this.P2P = new DummyP2P()
    this.syncNeeded = syncNeeded
    this.Mining = false
    this.TestDiff = NotBlock.Diff
  }

  Syncing() { return this.syncNeeded }

  GetBestHash() {
    return NotBlock.PrevHash
  }

  GetHeight() {
    return NotBlock.Height
  }

  SetMining(mining) {
    this.Mining = mining
  }

  GetDiff() {
    return this.TestDiff
  }
}

const MineABlock = async () => {
  const TestBlockchain = new DummyBlockchain(false)
  TestBlockchain.Mining = true
  const NewBlock = await Mining.MineBlock(TestBlockchain)
  console.log({ ...NewBlock })
}

MineABlock()
