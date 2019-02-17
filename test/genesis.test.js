/* eslint-disable class-methods-use-this */
const Genesis = require('../src/blockchain/Genesis')
const Block = require('../src/blockchain/Block')
const Message = require('../src/blockchain/Message')
const { Cst, CstError } = require('../src/Const')

const { Db: { Docs: CstDocs } } = Cst

const TestContent = 'Test message'
const TestFromAddress = 'Azerty123456789'

const TestMsg = Message.Create(TestFromAddress, TestContent)

const ValidBlock = Block.Create(null, 0, 0, 2, [TestMsg], Date.now())


const GenesisBlock = () => {
  const GenesisMsg = Message.Create(Cst.GenesisAddress, Cst.GenesisMsg)
  return Block.Create(null, 0, 0, Cst.StartDiff, [GenesisMsg], Cst.GenesisTimestamp)
}

class DummyDbWithGenesis {
  Find() { return Promise.resolve([GenesisBlock()]) }
}

class DummyDbWithoutGenesis {
  Find() {
    return Promise.resolve([])
  }

  Add(collection, data) {
    if (collection === CstDocs.Blockchain && data) return Promise.resolve(true)
    return Promise.reject()
  }
}
class DummyDbDoubleHieght0 {
  Find() {
    return Promise.resolve([1, 2])
  }
}

class DummyDbHeight0NotGenessis {
  Find() {
    return Promise.resolve([ValidBlock])
  }
}
class DummyDbGenesisFindFail {
  Find() {
    return Promise.reject()
  }
}
class DummyDbGenesisAddFail {
  Find() { return Promise.resolve([]) }

  Add() { return Promise.reject() }
}
class DummyBlockchain {
  constructor(TestCase) {
    switch (TestCase) {
      case 'BlockChainWithGenesiss':
        this.Db = new DummyDbWithGenesis()
        break
      case 'BlockChainWithoutGenesis':
        this.Db = new DummyDbWithoutGenesis()
        break
      case 'BlockChainDoubleHeight0':
        this.Db = new DummyDbDoubleHieght0()
        break
      case 'BlockChainHeight0NotGenessis':
        this.Db = new DummyDbHeight0NotGenessis()
        break
      case 'BlockChainWithoutGenesisFindFail':
        this.Db = new DummyDbGenesisFindFail()
        break
      case 'BlockChainWithoutGenesisAddFail':
        this.Db = new DummyDbGenesisAddFail()
        break
      default:
        this.Db = null
    }
  }
}

it('Verify existing genesis block', async () => {
  const BlockChainWithGenesiss = new DummyBlockchain('BlockChainWithGenesiss')
  const result = await Genesis.ExistInDb(BlockChainWithGenesiss)
  expect(result).toBeTruthy()
})

it('New blockchain without genesis: Verify created  genesis', async () => {
  const BlockChainWithoutGenesis = new DummyBlockchain('BlockChainWithoutGenesis')
  const result = await Genesis.ExistInDb(BlockChainWithoutGenesis)
  expect(result).toBeTruthy()
})

it('New blockchain without genesis: added failed in db', async () => {
  const BlockChainWithoutGenesisAddFailed = new DummyBlockchain('BlockChainWithoutGenesisAddFail')
  try {
    await Genesis.ExistInDb(BlockChainWithoutGenesisAddFailed)
  } catch (error) {
    expect(error).toEqual(new Error(`${CstError.GenessisNotAdded}`))
  }
})
it('New blockchain without genesis: find failed in db', async () => {
  const BlockChainWithoutGenesisFindFailed = new DummyBlockchain('BlockChainWithoutGenesisFindFail')
  try {
    await Genesis.ExistInDb(BlockChainWithoutGenesisFindFailed)
  } catch (error) {
    expect(error).toEqual(new Error(`${CstError.GenessisNotAdded}`))
  }
})

it('Blockchain with 2 blocks at height 0', async () => {
  const BlockChainWithGenesiss = new DummyBlockchain('BlockChainDoubleHeight0')
  try {
    await Genesis.ExistInDb(BlockChainWithGenesiss)
  } catch (error) {
    expect(error).toEqual(new Error(`${CstError.MultiBlocks}`))
  }
})

it('Blockchain with first blocks is not Genesis', async () => {
  const BlockChainWrongFirstBlock = new DummyBlockchain('BlockChainHeight0NotGenessis')
  try {
    await Genesis.ExistInDb(BlockChainWrongFirstBlock)
  } catch (error) {
    expect(error).toEqual(new Error(`${CstError.GenessisNotFirst}`))
  }
})
