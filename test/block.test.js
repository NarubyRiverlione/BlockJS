/* eslint-disable class-methods-use-this */
const Block = require('../src/blockchain/block')
const Message = require('../src/blockchain/message')
const { Cst } = require('../src/Const')

const TestContent = 'Test message'
const TestFromAddress = 'Azerty123456789'

const TestMsg = Message.Create(TestFromAddress, TestContent)
const TestMsg2 = Message.Create(TestFromAddress, TestContent)

const ValidBlock = Block.Create(123, 0, 0, 2, [TestMsg, TestMsg2], Date.now())

const SavedMgsHash = ValidBlock.HashMessages
const SavedBlockHash = ValidBlock.Blockhash()

const NotBlock = {
  PrevHash: 12,
  Height: 1556,
  Nonce: 669880,
  Diff: 1352,
  Version: 165,
  Timestamp: 1550499139,
  Messages: null,

}

it('Valid block creation: block with 2 messages', () => {
  expect(Block.IsValid(ValidBlock)).toBeTruthy()
})
it('Valid block: without messages', () => {
  const BlockWithoutMsg = Block.Create(null, 0, 0, 2, null, Date.now())
  expect(Block.IsValid(BlockWithoutMsg)).toBeTruthy()
})

it('InValid block: not a Block type', () => {
  expect(Block.IsValid(NotBlock)).toBeFalsy()
})
it('Invalid block detection: header incomplete without a nonce', () => {
  const BlockWithoutHeaders = Block.Create()
  expect(Block.IsValid(BlockWithoutHeaders)).toBeFalsy()
  expect(BlockWithoutHeaders).toBeNull()
})
it('Invalid block detection: no nonce', () => {
  const BlockWithoutNonce = Block.Create(null, 0, 0, 2, [TestMsg, TestMsg2], Date.now())
  BlockWithoutNonce.Nonce = null
  expect(BlockWithoutNonce instanceof Block).toBeTruthy()
  expect(Block.IsValid(BlockWithoutNonce)).toBeFalsy()
})
it('Invalid block: invalid message', () => {
  const InvalidMsg = { Hash: 123 } // invalid: not From address
  expect(Message.IsValid(InvalidMsg)).toBeFalsy()
  const InvalidBlock = Block.Create(null, 0, 0, 2, [TestMsg, InvalidMsg, TestMsg2], Date.now())
  expect(Block.IsValid(InvalidBlock)).toBeFalsy()
})

it('Invalid block detection: changed PrevHash', () => {
  const BlockChangedPrevHash = ValidBlock
  BlockChangedPrevHash.PrevHash = '6587459'
  const ChangedHash = BlockChangedPrevHash.Blockhash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})
it('Invalid block detection: changed Version', () => {
  const BlockChangedVersion = ValidBlock
  BlockChangedVersion.Version = '1.23.456'
  const ChangedHash = BlockChangedVersion.Blockhash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})
it('Invalid block detection: changed Nonce', () => {
  const BlockChangedNonce = ValidBlock
  BlockChangedNonce.Nonce = 9876
  const ChangedHash = BlockChangedNonce.Blockhash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})
it('Invalid block detection: changed diff', () => {
  const BlockChangedDiff = ValidBlock
  BlockChangedDiff.Diff = 456
  const ChangedHash = BlockChangedDiff.Blockhash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})
it('Invalid block detection: changed timestamp', () => {
  const BlockChangedTimestamp = ValidBlock
  BlockChangedTimestamp.Timestamp = Date.now() + 1
  const ChangedHash = BlockChangedTimestamp.Blockhash()
  expect(ChangedHash).not.toBe(SavedBlockHash)
})

it('Message cannot be changed', () => {
  const changedMsg = { ...TestMsg, Hash: 'ChangedHash' }
  ValidBlock.Messages = [changedMsg]
  const BlockHash = ValidBlock.Blockhash()
  const MessagesHash = ValidBlock.CalcHashMessages()
  expect(BlockHash).not.toBe(SavedBlockHash)
  expect(MessagesHash).not.toBe(SavedMgsHash)
})

it('Parse from object, without messages (read from db)', () => {
  // define Hash inside this test as other test mutates it for there run
  NotBlock.Hash = 'a048ff3c334069371a74b50caeb181035f204e2f0c22dedee284cc9e4dc4b1f7'
  const ParsedBlock = Block.ParseFromDb(NotBlock)
  expect(ParsedBlock).not.toBeNull()
  expect(Block.IsValid(ParsedBlock)).toBeTruthy()
})
it('Parse from object, invalid block hash', () => {
  NotBlock.Hash = 0
  const ParsedBlock = Block.ParseFromDb(NotBlock)
  expect(ParsedBlock).toBeNull()
  expect(Block.IsValid(ParsedBlock)).toBeFalsy()
})
it('Parse from object, with messages (read from db)', () => {
  NotBlock.Messages = [TestMsg]
  NotBlock.Hash = '6152d809492bb224d0ca66772f8365ba64d2aa8e9b929f3187d7be33c62796f1'
  const ParsedBlock = Block.ParseFromDb(NotBlock)
  expect(ParsedBlock).not.toBeNull()
  expect(Block.IsValid(ParsedBlock)).toBeTruthy()
})

it('Check prevhash: correct is in the blockchain', async () => {
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
  class DummyBlockChain {
    GetBlockWithHash() { return Promise.resolve(null) }
  }

  const NOkBlockChain = new DummyBlockChain()

  const result = await ValidBlock.CheckPrevHash(NOkBlockChain)
  expect(result).toBeFalsy()
})
it('Check prevhash: invalid error during search in the blockchain', async () => {
  class DummyBlockChain {
    GetBlockWithHash() { return Promise.reject() }
  }

  const NOkBlockChain = new DummyBlockChain()

  const result = await ValidBlock.CheckPrevHash(NOkBlockChain)
  expect(result).toBeFalsy()
})
it('Check prevhash: invalid, not first block without prevHash', async () => {
  const TestBlock = Block.Create(null, 5, 0, 2, [TestMsg], Date.now())
  // console.log(TestBlock.PrevHash)
  const result = await TestBlock.CheckPrevHash()
  expect(result).toBeFalsy()
})
it('Check prevhash: valid,  first genesisblock = no prevHash', async () => {
  const GenesisMsg = Message.Create(Cst.GenesisAddress, Cst.GenesisMsg)
  const GenesisBlock = Block.Create(null, 0, Cst.GenesisNonce, Cst.GenesisDiff, [GenesisMsg], Cst.GenesisTimestamp)
  // console.log(GenesisBlock.Blockhash())
  const result = await GenesisBlock.CheckPrevHash()
  expect(result).toBeTruthy()
})
