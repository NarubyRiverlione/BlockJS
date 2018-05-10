const assert = require('assert')
const expect = require('chai').expect

const Blockchain = require('../src/blockchain.js')
const Block = require('../src/block.js')
const Transaction = require('../src/transaction.js')
const Cst = require('../src/const.js')

const TestCoin = new Blockchain()

describe('Blockchain creation', () => {
  it('construction', () => {
    expect(TestCoin, 'constuctor failed').not.null
  })
  it('Is blockchain valid', () => {
    expect(TestCoin.IsValid()).is.true
  })
})

describe('Genesis tests', function () {
  const GenesisHash = '54270b3f032dfd5d5100def15439355986cdeff212f7240165b63ae38266d65f'
  const GenesisBlock = TestCoin.GetBlock()

  it('(GetBlock) Last block should exist', function () {
    expect(GenesisBlock).not.null
  })
  it('(GetHeight) Block height = 1', function () {
    expect(TestCoin.GetHeight()).to.equal(1)
  })
  it('(Block:IsValid)', function () {
    expect(GenesisBlock.IsValid()).to.be.true
  })
  it('(GetHash) Check hash', function () {
    expect(TestCoin.GetHash()).is.equal(GenesisHash)
  })
  it('(GetDiff) Check start diff', function () {
    expect(TestCoin.GetDiff()).is.equal(Cst.StartDiff)
  })
  it('Check timestamp', function () {
    expect(GenesisBlock.Timestamp).is.equal(Cst.GenesisTimestamp)
  })
  it('Check only 1 transaction', function () {
    expect(GenesisBlock.Transactions).not.null
    expect(GenesisBlock.Transactions.length).is.equal(1)
  })
  it('Check reward amount', function () {
    const [tx] = GenesisBlock.Transactions
    expect(tx).not.null
    expect(tx.Amount).is.equal(Cst.GenesisReward)
  })
  it('Check reward address', function () {
    const [tx] = GenesisBlock.Transactions
    expect(tx).not.null
    expect(tx.ToAddress).is.equal(Cst.GenesisRewardAddress)
  })
})

describe('Create block', function () {
  it('Invalid block detection: no headers', function () {
    const BlockWithoutHeaders = new Block()
    expect(BlockWithoutHeaders.IsValid()).is.false
  })
  it('Invalid block detection: changed hash', function () {
    const BlockChangedHash = new Block(111, null, null, 2, [])
    BlockChangedHash.Hash = 'WRONG!'
    expect(BlockChangedHash.IsValid()).is.false
  })
  it('Invalid block detection: changed timestamp', function () {
    const BlockChangedTimestamp = new Block(234, null, null, 2, [])
    BlockChangedTimestamp.Timestamp = Date.now() + 123
    expect(BlockChangedTimestamp.IsValid()).is.false
  })
  it('Invalid block detection: changed height', function () {
    const BlockChangedHeight = new Block(345, null, null, 2, [])
    BlockChangedHeight.Height = 123
    expect(BlockChangedHeight.IsValid()).is.false
  })
  it('Invalid block detection: changed PrevHash', function () {
    const BlockChangedPrevHash = new Block(242, null, null, 2, [])
    BlockChangedPrevHash.PrevHash = 'SHA256'
    expect(BlockChangedPrevHash.IsValid()).is.false
  })
  it('Invalid block detection: changed transaction', function () {
    const tx = new Transaction('fromMe', 'toYou', 321)
    const block = new Block(234, null, null, 2, [tx])
    expect(block.IsValid()).is.true

    tx.Amount = 123 // instead of 321
    block.Transactions = [tx]
    expect(block.IsValid()).is.false
  })
})

describe('Transaction', () => {
  it('Invalid tx: no sender', () => {
    const TX_noSender = new Transaction(null, 'toYou', 666)
    expect(TX_noSender.IsValid()).is.false
  })
})

describe('Add transaction to blockchain', function () {
  const tx = new Transaction('Me', 'You', 123)
  TestCoin.SendTX(tx)
  it('Add tx -> Pending tx = 1', () => {
    expect(TestCoin.GetCountPendingTX()).is.equal(1)
  })
  it('Height = 2', function () {
    TestCoin.MineBlock()
    expect(TestCoin.GetHeight()).is.equal(2)
  })
  it('Created block -> Pending tx = 0', () => {
    expect(TestCoin.GetCountPendingTX()).is.equal(0)
  })
  it('Is blockchain valid', () => {
    expect(TestCoin.IsValid()).is.true
  })
})

