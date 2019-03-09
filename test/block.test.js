/* eslint-disable class-methods-use-this */
const Block = require('../src/blockchain/block')
const Message = require('../src/blockchain/message')
const { Cst } = require('../src/Const')

const TestContent = 'Test message'
const TestFromAddress = 'Azerty123456789'

const NotBlock = {
  PrevHash: 12,
  Height: 1556,
  Nonce: 669880,
  Diff: 1352,
  Version: 165,
  Timestamp: 1550499139,
  Messages: null,

}

const Init = async () => {
  const TestMsg = await Message.Create(TestFromAddress, TestContent)
  const TestMsg2 = await Message.Create(TestFromAddress, TestContent)

  const ValidBlock = Block.Create(123, 0, 0, 2, [TestMsg, TestMsg2], Date.now())
  const SavedBlockHash = await ValidBlock.GetBlockHash()
  const SavedMgsHash = ValidBlock.HashMessages
  return {
    TestMsg, TestMsg2, ValidBlock, SavedMgsHash, SavedBlockHash,
  }
}

it('Valid block creation: block with 2 messages', async () => {
  const TestData = await Init()
  const TestBlock = await Block.IsValid(TestData.ValidBlock)
  expect(TestBlock).toBeTruthy()
})
it('Valid block: without messages', async () => {
  const BlockWithoutMsg = Block.Create(null, 0, 0, 2, null, Date.now())
  expect(await Block.IsValid(BlockWithoutMsg)).toBeTruthy()
})

it('InValid block: not a Block type', async () => {
  expect(await Block.IsValid(NotBlock)).toBeFalsy()
})
it('Invalid block detection: header invalid with string as nonce', async () => {
  const BlockWithoutHeaders = Block.Create('ggrr', 2, 'rrr')
  expect(await Block.IsValid(BlockWithoutHeaders)).toBeFalsy()
  expect(BlockWithoutHeaders).toBeNull()
})
it('Invalid block detection: no nonce', async () => {
  const TestData = await Init()
  const { TestMsg, TestMsg2 } = TestData
  const BlockWithoutNonce = Block.Create(null, 0, 0, 2, [TestMsg, TestMsg2], Date.now())
  BlockWithoutNonce.Nonce = null
  expect(BlockWithoutNonce instanceof Block).toBeTruthy()
  expect(await Block.IsValid(BlockWithoutNonce)).toBeFalsy()
})
it('Invalid block: invalid message', async () => {
  const TestData = await Init()
  const { TestMsg, TestMsg2 } = TestData
  const InvalidMsg = { Hash: 123 } // invalid: no from address
  expect(await Message.IsValid(InvalidMsg)).toBeFalsy()

  const InvalidBlock = Block.Create(null, 0, 0, 2, [TestMsg, InvalidMsg, TestMsg2], Date.now())
  expect(await Block.IsValid(InvalidBlock)).toBeFalsy()
})

it('Invalid block detection: changed PrevHash', async () => {
  const TestData = await Init()
  const { SavedBlockHash, ValidBlock } = TestData
  const BlockChangedPrevHash = ValidBlock
  BlockChangedPrevHash.PrevHash = '6587459'
  const ChangedHash = await BlockChangedPrevHash.GetBlockHash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})

it('Invalid block detection: changed Version', async () => {
  const TestData = await Init()
  const { SavedBlockHash, ValidBlock } = TestData
  const BlockChangedVersion = ValidBlock

  BlockChangedVersion.Version = '1.23.456'
  const ChangedHash = await BlockChangedVersion.GetBlockHash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})
it('Invalid block detection: changed Nonce', async () => {
  const TestData = await Init()
  const { SavedBlockHash, ValidBlock } = TestData
  const BlockChangedNonce = ValidBlock

  BlockChangedNonce.Nonce = 9876
  const ChangedHash = await BlockChangedNonce.GetBlockHash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})
it('Invalid block detection: changed diff', async () => {
  const TestData = await Init()
  const { SavedBlockHash, ValidBlock } = TestData
  const BlockChangedDiff = ValidBlock

  BlockChangedDiff.Diff = 456
  const ChangedHash = await BlockChangedDiff.GetBlockHash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})
it('Invalid block detection: changed timestamp', async () => {
  const TestData = await Init()
  const { SavedBlockHash, ValidBlock } = TestData
  const BlockChangedTimestamp = ValidBlock

  BlockChangedTimestamp.Timestamp = Date.now() + 1
  const ChangedHash = await BlockChangedTimestamp.GetBlockHash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})

it('Message cannot be changed', async () => {
  const TestData = await Init()
  const {
    SavedMgsHash, SavedBlockHash, ValidBlock, TestMsg,
  } = TestData
  const BlockChangedMsg = ValidBlock

  const changedMsg = { ...TestMsg, Hash: 'ChangedHash' }
  BlockChangedMsg.Messages = [changedMsg]

  const BlockHash = await ValidBlock.GetBlockHash()
  const MessagesHash = await ValidBlock.GetMsgsHash()
  expect(BlockHash).not.toBe(SavedBlockHash)
  expect(MessagesHash).not.toBe(SavedMgsHash)
})

it('Parse from object, without messages (simulation read from db)', async () => {
  // define Hash inside this test as other test mutates it for there run
  NotBlock.Hash = 'b3deb664e79820672a23cbf751461dda48b18a95cf000b83ba3c33a9a1bf4d6e'
  const ParsedBlock = await Block.ParseFromDb(NotBlock)
  expect(ParsedBlock).not.toBeNull()
  const Valid = await Block.IsValid(ParsedBlock)
  expect(Valid).toBeTruthy()
})
it('Parse from object, with messages (simulation read from db)', async () => {
  const TestData = await Init()
  const { TestMsg } = TestData
  const FromDb = { ...NotBlock }
  FromDb.Messages = [TestMsg]
  FromDb.Hash = 'a0976e258246ba35994ffe0ba1b1cc427701fdf3251a6b6cafa3c03da4f93bbb'
  const ParsedBlock = await Block.ParseFromDb(FromDb)
  expect(ParsedBlock).not.toBeNull()
  expect(await Block.IsValid(ParsedBlock)).toBeTruthy()
})
it('Parse from object, invalid block hash', async () => {
  NotBlock.Hash = 0
  const ParsedBlock = await Block.ParseFromDb(NotBlock)
  expect(ParsedBlock).toBeNull()
  expect(await Block.IsValid(ParsedBlock)).toBeFalsy()
})
it('Parse from object, invalid block: no heigt', async () => {
  const BlockWithoutHeight = { ...NotBlock }
  BlockWithoutHeight.Height = undefined

  const ParsedBlock = await Block.ParseFromDb(BlockWithoutHeight)
  expect(ParsedBlock).toBeNull()
  expect(await Block.IsValid(ParsedBlock)).toBeFalsy()
})
it('Check prevhash: correct is in the blockchain', async () => {
  const TestData = await Init()
  const { ValidBlock } = TestData

  class DummyBlockChain {
    GetBlockWithHash() {
      return Promise.resolve(Block.Create(null, 0, 0, 2, [], Date.now()))
    }
  }

  const OkBlockChain = new DummyBlockChain()

  const result = await ValidBlock.CheckPrevHash(OkBlockChain)
  expect(result).toBeTruthy()
})
it('Check prevhash: invalid is not in the blockchain', async () => {
  const TestData = await Init()
  const { ValidBlock } = TestData
  class DummyBlockChain {
    GetBlockWithHash() { return Promise.resolve(null) }
  }

  const NOkBlockChain = new DummyBlockChain()

  const result = await ValidBlock.CheckPrevHash(NOkBlockChain)
  expect(result).toBeFalsy()
})
it('Check prevhash: invalid error during search in the blockchain', async () => {
  const TestData = await Init()
  const { ValidBlock } = TestData
  class DummyBlockChain {
    GetBlockWithHash() { return Promise.reject() }
  }

  const NOkBlockChain = new DummyBlockChain()

  const result = await ValidBlock.CheckPrevHash(NOkBlockChain)
  expect(result).toBeFalsy()
})
it('Check prevhash: invalid, not first block without prevHash', async () => {
  const TestData = await Init()
  const { TestMsg } = TestData
  const TestBlock = Block.Create(null, 5, 0, 2, [TestMsg], Date.now())
  class DummyBlockChain {
    GetBlockWithHash() { return Promise.reject() }
  }
  const NOkBlockChain = new DummyBlockChain()
  const result = await TestBlock.CheckPrevHash(NOkBlockChain)
  expect(result).toBeFalsy()
})

it('Check prevhash: valid,  first genesisblock = no prevHash', async () => {
  const GenesisMsg = await Message.Create(Cst.GenesisAddress, Cst.GenesisMsg)
  const GenesisBlock = Block.Create(null, 0, Cst.GenesisNonce, Cst.GenesisDiff, [GenesisMsg], Cst.GenesisTimestamp)

  class DummyBlockChain {
    GetBlockWithHash() { return Promise.resolve() }
  }
  const OkBlockChain = new DummyBlockChain()

  const result = await GenesisBlock.CheckPrevHash(OkBlockChain)
  expect(result).toBeTruthy()
})

it('Save block to db (saves calculated hash)', async () => {
  const TestData = await Init()
  const { ValidBlock } = TestData
  const TestBlock = await Block.IsValid(ValidBlock)
  expect(TestBlock).toBeTruthy()

  class DummyDbSave {
    Add() { return Promise.resolve(true) }
  }
  const dummyDb = new DummyDbSave()
  const result = await ValidBlock.Save(dummyDb)
  expect(result).toBeTruthy()
})

it('Save block to db failed', async () => {
  const TestData = await Init()
  const { ValidBlock } = TestData
  const TestBlock = await Block.IsValid(ValidBlock)
  expect(TestBlock).toBeTruthy()

  class DummyDbSaveFaild {
    Add() { return Promise.reject(new Error('simulation db add failed')) }
  }
  const dummyDb = new DummyDbSaveFaild()
  const result = await ValidBlock.Save(dummyDb)
  expect(result).toBeNull()
})
