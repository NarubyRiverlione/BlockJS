/* eslint no-unused-expressions:"off" */

const expect = require('chai').expect // eslint-disable-line 

const Coin = require('../src/coin.js')
const Block = require('../src/block.js')
// const Transaction = require('../src/transaction.js')
// const Wallet = require('../src/wallet.js')
const Cst = require('../src/const.js')

let TestCoin


it('Blockchain creation', async () => {
  TestCoin = await Coin.Start()
  expect(TestCoin, 'creation failed').not.null

  describe('Genesis tests', () => {
    let GenesisBlock
    let GenesisBlockInDB

    it('Load genesis from db', async () => {
      GenesisBlockInDB = await TestCoin.GetBlockAtHeight(0)
    })
    it('(GetBlockAtHeight(0))  block with height 0 should exist in DB ', () => {
      expect(GenesisBlockInDB).not.null
    })
    it('Cast DB info to block should work', () => {
      GenesisBlock = Block.ParseFromDb(GenesisBlockInDB)
      expect(GenesisBlock).is.not.null
      expect(GenesisBlock.IsValid()).to.be.true
    })
    // it('(Height) Block height = 0', () => {
    //   expect(TestCoin.H()).to.equal(0)
    // })
    it('(GetHash) Check hash', () => {
      expect(GenesisBlock.Blockhash()).is.equal(Cst.GenesisHash)
    })
    it('(Diff) Check start diff', () => {
      expect(GenesisBlock.Diff).is.equal(Cst.StartDiff)
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
      expect(tx.ToAddress).is.equal(Cst.GenesisAddress)
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
      const tx = Coin.CreateTX('fromMe', 'toYou', 321)
      const block = new Block(null, 0, 2, [tx], Date.now())
      // const savedBlockhash = block.Blockhash()
      const savedTXhash = Block.HashTransactions
      const savedTX = Block.Transaction
      expect(block.IsValid()).is.true

      tx.Amount = 123 // instead of 321
      block.Transactions = [tx]

      expect(block.Blockhash(), 'blockhash must  be changed').not.equal(savedTXhash)
      expect(block.HashTransactions, 'tx hash must  be changed').not.equal(savedTXhash)
      expect(block.Transactions, 'transaction in block must not be changed').not.equal(savedTX)
    })
  })

  describe('Transaction', () => {
    it('Invalid tx: no sender', () => {
      const tx = Coin.CreateTX(null, 'toYou', 666)
      expect(tx.IsValid()).is.false
    })
    it('Invalid tx: no reciever', () => {
      const tx = Coin.CreateTX('me', null, 666)
      expect(tx.IsValid()).is.false
    })
    it('Invalid tx: no amount', () => {
      const tx = Coin.CreateTX('me', 'toYou', null)
      expect(tx.IsValid()).is.false
    })
  })
})

// xdescribe('Add transaction to blockchain & mine new block', () => {
//   expect(TestCoin.AmountOfPendingTX, 'no pending TX before add tests').is.equal(0)
//   const MeWallet = Coin.CreateWallet('Me')
//   const YouWallet = Coin.CreateWallet('You')
//   const SendAmount = 123.4567
//   const tx = Coin.CreateTX(MeWallet, YouWallet, SendAmount)
//   TestCoin.SendTX(tx)

//   it('Add tx -> amount of pending tx = 1', () => {
//     expect(TestCoin.AmountOfPendingTX).is.equal(1)
//   })
//   it('Height = 1', () => {
//     TestCoin.MineBlock()
//     expect(TestCoin.Height).is.equal(1)
//   })
//   it('Created block -> amount of pending tx = 0', () => {
//     expect(TestCoin.AmountOfPendingTX).is.equal(0)
//   })
//   it('Is blockchain valid', () => {
//     expect(TestCoin.IsValid()).is.true
//   })
//   it('Check balance sender.', () => {
//     const MeBalance = TestCoin.GetBalance(MeWallet)
//     expect(MeBalance).is.equal(-SendAmount)
//   })
//   it('Check balance reciever.', () => {
//     const RecieverBalance = TestCoin.GetBalance(YouWallet)
//     expect(RecieverBalance).is.equal(SendAmount)
//   })
// })

// xdescribe('Changes in a block should invalid blockchain', () => {
//   it('Change prev hash', () => {
//     const block = TestCoin.GetBlockAtHeight(1)
//     expect(block).not.null
//     block.PrevHash = 'ALTERED'
//     expect(TestCoin.IsValid()).is.false
//   })
// })
