/* eslint no-unused-expressions:"off" */

const expect = require('chai').expect // eslint-disable-line 

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

describe('Genesis tests', () => {
  const GenesisHash = '54270b3f032dfd5d5100def15439355986cdeff212f7240165b63ae38266d65f'
  const GenesisBlock = TestCoin.GetBlock()

  it('(GetBlock) Last block should exist', () => {
    expect(GenesisBlock).not.null
    expect(GenesisBlock.IsValid()).to.be.true
  })
  it('(Height) Block height = 0', () => {
    expect(TestCoin.Height).to.equal(0)
  })
  it('(GetHash) Check hash', () => {
    expect(TestCoin.GetHash()).is.equal(GenesisHash)
  })
  it('(Diff) Check start diff', () => {
    expect(TestCoin.Diff).is.equal(Cst.StartDiff)
  })
  it('Check timestamp', () => {
    expect(GenesisBlock.Timestamp).is.equal(Cst.GenesisTimestamp)
  })
  it('Check only 1 transaction', () => {
    expect(GenesisBlock.Transactions).not.null
    expect(GenesisBlock.Transactions.length).is.equal(1)
  })
  it('Check reward amount', () => {
    const [tx] = GenesisBlock.Transactions
    expect(tx).not.null
    expect(tx.Amount).is.equal(Cst.GenesisReward)
  })
  it('Check reward address', () => {
    const [tx] = GenesisBlock.Transactions
    expect(tx).not.null
    expect(tx.ToAddress).is.equal(Cst.GenesisRewardAddress)
  })
})

describe('Create block', () => {
  it('Invalid block detection: no headers', () => {
    const BlockWithoutHeaders = new Block()
    expect(BlockWithoutHeaders.IsValid()).is.false
  })
  it('Invalid block detection: changed timestamp', () => {
    const BlockChangedTimestamp = new Block(null, 0, 2, [], Date.now())
    const blockhash = BlockChangedTimestamp.Blockhash()

    BlockChangedTimestamp.Timestamp = Date.now() + 1
    expect(BlockChangedTimestamp.Blockhash()).not.equal(blockhash)
  })
  it('Invalid block detection: changed PrevHash', () => {
    const BlockChangedPrevHash = new Block(null, 0, 2, [], Date.now())
    const blockhash = BlockChangedPrevHash.Blockhash()

    BlockChangedPrevHash.PrevHash = 'SHA256'
    expect(BlockChangedPrevHash.Blockhash()).not.equal(blockhash)
  })
  it('Transaction cannot be changed', () => {
    const tx = new Transaction('fromMe', 'toYou', 321)
    const block = new Block(null, 0, 2, [tx], Date.now())
    // const savedBlockhash = block.Blockhash()
    const savedTXhash = Block.TXhash
    const savedTX = Block.Transaction
    expect(block.IsValid()).is.true

    tx.Amount = 123 // instead of 321
    block.Transactions = [tx]

    expect(block.Blockhash(), 'blockhash must  be changed').not.equal(savedTXhash)
    expect(block.TXhash, 'tx hash must  be changed').not.equal(savedTXhash)
    expect(block.Transactions, 'transaction in block must not be changed').not.equal(savedTX)
  })
})

describe('Transaction', () => {
  it('Invalid tx: no sender', () => {
    const tx = new Transaction(null, 'toYou', 666)
    expect(tx.IsValid()).is.false
  })
  it('Invalid tx: no reciever', () => {
    const tx = new Transaction('me', null, 666)
    expect(tx.IsValid()).is.false
  })
  it('Invalid tx: no amount', () => {
    const tx = new Transaction('me', 'toYou', null)
    expect(tx.IsValid()).is.false
  })
})

describe('Add transaction to blockchain & mine new block', () => {
  expect(TestCoin.AmountOfPendingTX, 'no pending TX before add tests').is.equal(0)

  const tx = new Transaction('Me', 'You', 123)
  TestCoin.SendTX(tx)

  it('Add tx -> amount of pending tx = 1', () => {
    expect(TestCoin.AmountOfPendingTX).is.equal(1)
  })
  it('Height = 1', () => {
    TestCoin.MineBlock()
    expect(TestCoin.Height).is.equal(1)
  })
  it('Created block -> amount of pending tx = 0', () => {
    expect(TestCoin.AmountOfPendingTX).is.equal(0)
  })
  it('Is blockchain valid', () => {
    expect(TestCoin.IsValid()).is.true
  })
})

describe('Changes in a block should invalid blockchain', () => {
  it('Change prev hash', () => {
    const block = TestCoin.GetBlock(1)
    expect(block).not.null
    block.PrevHash = 'ALTERED'
    expect(TestCoin.IsValid()).is.false
  })
})
