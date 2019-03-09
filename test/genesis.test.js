/* eslint-disable class-methods-use-this */
const Genesis = require('../src/blockchain/genesis')
const Block = require('../src/blockchain/block')
const Message = require('../src/blockchain/message')
const { Cst, CstError } = require('../src/Const')

const { Db: { Docs: CstDocs } } = Cst

const TestContent = 'Test message'
const TestFromAddress = 'Azerty123456789'


const CreateGenesisBlock = async () => {
  const GenesisMsg = await Message.Create(Cst.GenesisAddress, Cst.GenesisMsg)
  return Block.Create(null, 0, Cst.GenesisNonce, Cst.GenesisDiff, [GenesisMsg], Cst.GenesisTimestamp)
}

class DummyDbWithGenesis {
  Find() {
    return new Promise((resolve) => {
      CreateGenesisBlock()
        .then((GenesisBlock) => {
          const DbFirstBlock = { ...GenesisBlock }
          DbFirstBlock.Hash = Cst.GenesisHashBlock
          resolve([DbFirstBlock])
        })
    })
  }
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
class DummyDbDoubleHeight0 {
  Find() {
    return Promise.resolve([1, 2])
  }
}

class DummyDbHeight0NotGenessis {
  Find() {
    return new Promise(async (resolve) => {
      const TestMsg = await Message.Create(TestFromAddress, TestContent)
      const DbValidBlock = Block.Create(null, 0, 0, 2, [TestMsg], 1552063321)
      DbValidBlock.Hash = await DbValidBlock.GetBlockHash()
      resolve([DbValidBlock])
    })
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
        this.Db = new DummyDbDoubleHeight0()
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
    expect(error.message).toEqual(`${CstError.GenessisNotFirst}`)
  }
})
