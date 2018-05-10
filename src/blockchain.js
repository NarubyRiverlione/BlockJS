const Transaction = require('./transaction.js')
const Block = require('./block.js')
const Cst = require('./const.js')
const Debug = require('debug')('blockjs:blockchain')

AddBlock = ((block, blockchain) => {
  if (block instanceof Block === false) {
    Debug('AddBlock: argument is not a Block')
    return
  }
  if (!block.IsValid()) {
    Debug('AddBlock: block is not valid')
    return
  }
  if (block.PrevHash !== blockchain.GetHash()) {
    Debug('AddBlock: previous hash of block is not lastest hash in blockchain')
    return
  }
  if (block.Height !== blockchain.GetHeight() + 1) {
    Debug('AddBlock: height of block is not next height in blockchain')
    return
  }
  Debug('AddBlock: Succes')
  return [].concat(...blockchain.Chainblocks, block)
})


CreateGenesisBlock = (() => {
  const GenesisTX = new Transaction(null, Cst.GenesisRewardAddress, Cst.GenesisReward)
  return new Block(0, null, null, Cst.StartDiff, [GenesisTX], Cst.GenesisTimestamp)
})

class Blockchain {
  constructor(version = 1) {
    this.Version = version
    this.Chainblocks = [CreateGenesisBlock()]
    this.BlockReward = Cst.StartBlockReward
    this.PendingTransactions = []
  }


  GetHeight() {
    return this.Chainblocks.length
  }

  GetBlock() {
    const latestBlock = this.Chainblocks[this.GetHeight() - 1]
    return latestBlock
  }

  GetHash() {
    const lastBlock = this.GetBlock()
    return lastBlock.Hash
  }

  GetDiff() {
    const lastBlock = this.GetBlock()
    return lastBlock.Diff
  }

  GetCountPendingTX() {
    return this.PendingTransactions.length
  }

  SendTX(tx) {
    if (tx instanceof Transaction === false) {
      Debug('SendTX: argument is not a Transaction')
      return
    }
    if (!tx.IsValid()) {
      Debug('SendTX: tx is not valid')
      return
    }
    this.PendingTransactions.push(tx)
  }

  MineBlock(height = this.GetHeight() + 1, prevHash = this.GetHash(), timestamp = Date.now()) {
    // create new block with all pending transactions
    const newBlock = new Block(
      height,
      prevHash,
      null,
      Cst.StartDiff,
      this.PendingTransactions,
      timestamp
    )
    // add block to blockchain
    this.Chainblocks = AddBlock(newBlock, this)
    // clear pending transactions
    this.PendingTransactions = []
  }

  IsValid() {
    let rememberPrevHash = null
    this.Chainblocks.forEach(block => {
      // each block should be valid on it own
      if (!block.IsValid()) return false
      // block prevHash should be previous hash (genesis has null)
      if (block.PrevHash !== rememberPrevHash) return false
      rememberPrevHash = block.Hash
    })
    return true
  }

  toString() {
    return JSON.stringify(this)
  }
}

module.exports = Blockchain