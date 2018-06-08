/* eslint no-unused-expressions:"off" */

const expect = require('chai').expect // eslint-disable-line 

const Coin = require('../src/blockchain/coin.js')
const Block = require('../src/blockchain/block.js')
// const Transaction = require('../src/message.js')
// const Wallet = require('../src/wallet.js')
const Cst = require('../src/blockchain/const.js')

let TestCoin
const ServerPort = parseInt(process.env.Port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbPort, 10) || Cst.DbPort
const APIPort = parseInt(process.env.apiPort, 10) || Cst.API.DefaultPort


it('Blockchain', async () => {
  TestCoin = await Coin.Start(ServerPort, '127.0.0.1', DbPort, APIPort)
  expect(TestCoin, 'creation failed').not.null

  describe('Genesis tests', () => {
    let GenesisBlock

    it('Load genesis from db', async () => {
      GenesisBlock = await TestCoin.GetBlockAtHeight(0)
      expect(GenesisBlock).not.null
      expect(Block.IsValid(GenesisBlock)).to.be.true
    })
    it('(GetBestHash) Check hash', () => {
      expect(GenesisBlock.Blockhash()).is.equal(Cst.GenesisHash)
    })
    it('(Diff) Check start diff', () => {
      expect(GenesisBlock.Diff).is.equal(Cst.StartDiff)
    })
    it('Check timestamp', () => {
      expect(GenesisBlock.Timestamp).is.equal(Cst.GenesisTimestamp)
    })
    it('Check only 1 message', () => {
      expect(GenesisBlock.Transactions).not.null
      expect(GenesisBlock.Transactions.length).is.equal(1)
    })
    it('Check reward amount', () => {
      const [msg] = GenesisBlock.Transactions
      expect(msg).not.null
      expect(msg.Amount).is.equal(Cst.GenesisReward)
    })
    it('Check reward address', () => {
      const [msg] = GenesisBlock.Transactions
      expect(msg).not.null
      expect(msg.ToAddress).is.equal(Cst.GenesisAddress)
    })
  })

  describe('Create block', async () => {
    const msg = await TestCoin.CreateTX(`${Cst.AddressPrefix}toAnAddressYou`, 321)
    const ValidBlock = Block.Create(null, 0, 2, [msg], Date.now())
    const savedTXhash = ValidBlock.HashTransactions
    const savedTX = ValidBlock.Transaction
    const blockhash = ValidBlock.Blockhash()

    it('Valid block creation', () => {
      expect(Block.IsValid(ValidBlock)).is.true
    })
    it('Invalid block detection: no headers', () => {
      const BlockWithoutHeaders = new Block()
      expect(Block.IsValid(BlockWithoutHeaders)).is.false
    })
    it('Invalid block detection: changed timestamp', () => {
      const BlockChangedTimestamp = ValidBlock

      BlockChangedTimestamp.Timestamp = Date.now() + 1
      expect(BlockChangedTimestamp.Blockhash()).not.equal(blockhash)
    })
    it('Invalid block detection: changed PrevHash', () => {
      const BlockChangedPrevHash = ValidBlock
      BlockChangedPrevHash.PrevHash = 'SHA256'
      expect(BlockChangedPrevHash.Blockhash()).not.equal(blockhash)
    })
    it('Transaction cannot be changed', () => {
      const changedTX = Object.assign({ Amount: 123 }, msg) // instead of 321
      ValidBlock.Transactions = [changedTX]

      expect(ValidBlock.Blockhash(), 'blockhash must  be changed').not.equal(savedTXhash)
      expect(ValidBlock.HashTransactions, 'messages hash must be changed').not.equal(savedTXhash)
      expect(ValidBlock.Transactions, 'message in block must be changed').not.equal(savedTX)
    })
  })

  // xdescribe('Transaction', () => {
  //   it('Invalid msg: no sender', () => {
  //     const msg = Coin.CreateTX(null, 'toYou', 666)
  //     expect(msg.IsValid()).is.false
  //   })
  //   it('Invalid msg: no reciever', () => {
  //     const msg = Coin.CreateTX('me', null, 666)
  //     expect(msg.IsValid()).is.false
  //   })
  //   it('Invalid msg: no amount', () => {
  //     const msg = Coin.CreateTX('me', 'toYou', null)
  //     expect(msg.IsValid()).is.false
  //   })
  // })
})

xdescribe('Add message to blockchain & mine new block', () => {
  expect(TestCoin.AmountOfPendingTX, 'no pending TX before add tests').is.equal(0)
  const You = 'SPICE_yourAddress'
  const SendAmount = 123.4567
  const msg = Coin.CreateTX(You, SendAmount)
  TestCoin.SendTX(msg)

  it('Add msg -> amount of pending msg = 1', () => {
    expect(TestCoin.AmountOfPendingTX).is.equal(1)
  })
  it('Height = 1', () => {
    TestCoin.MineBlock()
    expect(TestCoin.Height).is.equal(1)
  })
  it('Created block -> amount of pending msg = 0', () => {
    expect(TestCoin.AmountOfPendingTX).is.equal(0)
  })
  it('Is blockchain valid', () => {
    expect(TestCoin.IsValid()).is.true
  })
  it('Check balance sender.', () => {
    const MeBalance = TestCoin.GetBalance(MeWallet)
    expect(MeBalance).is.equal(-SendAmount)
  })
  it('Check balance reciever.', () => {
    const RecieverBalance = TestCoin.GetBalance(YouWallet)
    expect(RecieverBalance).is.equal(SendAmount)
  })
})

// xdescribe('Changes in a block should invalid blockchain', () => {
//   it('Change prev hash', () => {
//     const block = TestCoin.GetBlockAtHeight(1)
//     expect(block).not.null
//     block.PrevHash = 'ALTERED'
//     expect(TestCoin.IsValid()).is.false
//   })
// })
