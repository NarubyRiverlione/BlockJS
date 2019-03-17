/* eslint-disable class-methods-use-this */
const Mine = require('../src/blockchain/mining.js')
const { CreateMessage } = require('../src/blockchain/message.js')
// const Block = require('../src/blockchain/block.js')

const { Cst, CstError } = require('../src/Const')

const { Db: { Docs: CstDocs } } = Cst

const TestContent = 'Test message'
const TestContent2 = '2th Test message'
const TestFromAddress = 'Azerty123456789'


class DummyDb {
  async Find(doc) {
    if (doc === CstDocs.PendingMessages) {
      const TestMsg = await CreateMessage(TestFromAddress, TestContent)
      const TestMsg2 = await CreateMessage(TestFromAddress, TestContent2)

      return Promise.resolve(([TestMsg, TestMsg2]))
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
  constructor(syncNeeded = false, testDiff = 1) {
    this.Db = new DummyDb()
    this.P2P = new DummyP2P()
    this.syncNeeded = syncNeeded
    this.Mining = false
    this.TestDiff = testDiff
  }

  Syncing() { return this.syncNeeded }

  GetBestHash() {
    return 123
  }

  GetHeight() {
    return 456
  }

  SetMining(mining) {
    this.Mining = mining
  }

  GetDiff() {
    return this.TestDiff
  }
}

// disabled test to prevent cpu load as jest runs automatically in Visual Code
it('Mine a block', async () => {
  const TestBlockchain = new DummyBlockchain(false)
  TestBlockchain.SetMining(true)
  const NewBlock = await Mine.MineBlock(TestBlockchain)
  expect(NewBlock).not.toBeNull()
  // FIXME: IsValid test interference with the' mining aborted' test
  // const valid = await Block.IsValid(NewBlock)
  // expect(valid).toBeTruthy()
})

it('Cannot mine if not sync', async () => {
  const TestBlockchainNotSync = new DummyBlockchain(true)
  TestBlockchainNotSync.SetMining(true)
  const resultNoSync = await Mine.MineBlock(TestBlockchainNotSync)
  expect(resultNoSync).toBe(CstError.MineNotSync)
})

it('Mining aborted = result is null', async () => {
  const TestBlockchainAbort = new DummyBlockchain(false, 10)
  TestBlockchainAbort.SetMining(true)
  // abort after 2sec
  jest.useFakeTimers()
  setTimeout(() => {
    TestBlockchainAbort.SetMining(false)
  }, 1000)
  jest.runAllTimers()
  const resultAbort = await Mine.MineBlock(TestBlockchainAbort)

  expect(resultAbort).toBeNull()
})
