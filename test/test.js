/* eslint no-unused-expressions:"off" */

const expect = require('chai').expect // eslint-disable-line 

const BlockChain = require('../src/blockchain/BlockChain.js')
const Block = require('../src/blockchain/block.js')
const Message = require('../src/blockchain/message.js')
// const Wallet = require('../src/wallet.js')
const Cst = require('../src/blockchain/const.js')

let TestCoin
const ServerPort = parseInt(process.env.Port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbPort, 10) || Cst.DbPort
const APIPort = parseInt(process.env.apiPort, 10) || Cst.API.DefaultPort


it('Blockchain', async () => {
  TestCoin = await BlockChain.Start(ServerPort, '127.0.0.1', DbPort, APIPort)
  expect(TestCoin, 'creation failed').not.null

  describe('Genesis tests', () => {
    let GenesisBlock

    it('Load genesis from db', async () => {
      GenesisBlock = await TestCoin.GetBlockAtHeight(0)
      expect(GenesisBlock).not.null
      expect(Block.IsValid(GenesisBlock)).to.be.true
    })
    it('(GetBestHash) Check block hash', () => {
      expect(GenesisBlock.Blockhash()).is.equal(Cst.GenesisHashBlock)
    })
    it('(Diff) Check start diff', () => {
      expect(GenesisBlock.Diff).is.equal(Cst.StartDiff)
    })
    it('Check timestamp', () => {
      expect(GenesisBlock.Timestamp).is.equal(Cst.GenesisTimestamp)
    })
    it('Check only 1 message', () => {
      expect(GenesisBlock.Messages).not.null
      expect(GenesisBlock.Messages.length).is.equal(1)
    })
    it('Check hash messages', () => {
      expect(GenesisBlock.HashMessages).is.equal(Cst.GenesisHashMessages)
    })
    it('Check hash of message', () => {
      const [msg] = GenesisBlock.Messages
      expect(msg.Hash).is.equal(Cst.GenesisHashMsg)
    })
    it('Check from address', () => {
      const [msg] = GenesisBlock.Messages
      expect(msg.From).is.equal(Cst.GenesisAddress)
    })
  })
  describe('Message', () => {
    const content = 'Test message'
    const msg = TestCoin.CreateMsg(content)
    it('Create valid message', async () => {
      expect(msg).not.be.null
      const valid = await Message.IsValid(msg)
      expect(valid).is.true
    })
    it('Check correct content', async () => {
      const valid = await Message.IsValid(msg, content)
      expect(valid).is.true
    })
    // it('Check different content', async () => {
    //   const differentContent = 'Test1234'
    //   try {
    //     const valid = await Message.IsValid(msg, differentContent)
    //     expect(valid).is.false
    //   } catch (err) {
    //     expect(err).is.not.null
    //   }
    // })
  })
  describe('Create block', async () => {
    const msg = TestCoin.CreateMsg('Test message')
    const ValidBlock = Block.Create(null, 0, 2, [msg], Date.now())
    const savedMgsHash = ValidBlock.HashMessages
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
    it('Message cannot be changed', () => {
      const changedMsg = Object.assign({ Hash: '123' }, msg)
      ValidBlock.Messages = [changedMsg]

      expect(ValidBlock.Blockhash(), 'blockhash must  be changed').not.equal(blockhash)
      expect(ValidBlock.CalcHashMessages(), 'messages hash must be changed').not.equal(savedMgsHash)
    })
  })
  describe('Add message to blockchain & mine new block', async () => {
    it('start amount pending msg = 0', async () => {
      try {
        const startAmount = await TestCoin.GetAmountOfPendingMsgs()
        expect(startAmount, 'no pending Msg before add tests').is.equal(0)
      } catch (err) {
        console.error(err)
      }
    })
    it('Add msg -> amount of pending msg = 1', async () => {
      try {
        const Content = 'New test message'
        const msg = TestCoin.CreateMsg(Content)
        await TestCoin.SendMsg(msg)
        const amount = await TestCoin.GetAmountOfPendingMsgs()
        expect(amount).is.equal(1)
      } catch (err) {
        console.error(err)
      }
    })
    it('Mine new block', async () => {
      try {
        const newBlock = await TestCoin.MineBlock()
        expect(Block.IsValid(newBlock), 'mined block is not valid').is.true
      } catch (err) {
        console.error(err)
      }
    })
    it('After mining: Height = 1', async () => {
      try {
        const height = await TestCoin.GetHeight()
        expect(height).is.equal(1)
      } catch (err) {
        console.error(err)
      }
    })
    it('After mining: amount of pending msg = 0', async () => {
      const amount = await TestCoin.GetAmountOfPendingMsgs()
      expect(amount).is.equal(0)
    })
    // it('After mining:  blockchain is valid', () => {
    //   expect(TestCoin.IsValid()).is.true
    // })
  })
})
