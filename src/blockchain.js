const Transaction = require('./transaction.js')
const Block = require('./block.js')
const Wallet = require('./wallet.js')
const Cst = require('./const.js')
const Debug = require('debug')('blockjs:blockchain')

const Chainblock = ((height, hash, block) => ({ height, hash, block }))

const AddBlock = ((block, blockchain) => {
  if (block instanceof Block === false) {
    Debug('ERROR AddBlock: argument is not a Block')
    return null
  }
  if (!block.IsValid()) {
    Debug('ERROR AddBlock: block is not valid')
    return null
  }
  if (block.PrevHash !== blockchain.GetHash()) {
    Debug('ERROR AddBlock: previous hash of block is not lastest hash in blockchain')
    return null
  }

  const blockhash = block.Blockhash()
  const newHeight = blockchain.Height + 1
  const newChainBlock = Chainblock(newHeight, blockhash, block)
  const newChainblocks = [].concat(...blockchain.Chainblocks, newChainBlock)
  return newChainblocks
})

const CreateGenesisBlock = (() => {
  const GenesisWallet = new Wallet(Cst.GenesisRewardWallet, Cst.GenesisAddress)
  const GenesisTX = new Transaction(null, GenesisWallet, Cst.GenesisReward, true)
  return new Block(null, 0, Cst.StartDiff, [GenesisTX], Cst.GenesisTimestamp)
})


class Blockchain {
  constructor(version = 1) {
    this.Version = version
    this.BlockReward = Cst.StartBlockReward
    this.PendingTransactions = []

    const genesis = CreateGenesisBlock()

    this.Chainblocks = [Chainblock(0, genesis.Blockhash(), genesis)]
    /* [
      {height, blockhask, block}
    ] */
  }
  get Height() {
    const allHeights = this.Chainblocks.map(chainblock => chainblock.height)
    const maxHeight = Math.max(...allHeights)
    return maxHeight
  }
  get Diff() {
    const lastBlock = this.GetBlock()
    return lastBlock.Diff
  }
  get AmountOfPendingTX() {
    return this.PendingTransactions.length
  }


  // get block at height, defaults to blockchain height = last block
  GetBlock(atHeight = this.Height) {
    // const blockchainHeight = this.GetHeight()
    const higestChainblock = this.Chainblocks.find(chainblock => chainblock.height === atHeight)
    return higestChainblock.block
  }

  GetHash() {
    const lastBlock = this.GetBlock()
    return lastBlock.Blockhash()
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

  MineBlock(prevHash = this.GetHash(), timestamp = Date.now()) {
    // create new block with all pending transactions
    const newBlock = new Block(
      prevHash,
      0,
      Cst.StartDiff,
      this.PendingTransactions,
      timestamp,
    )

    // add block (if valid) to blockchain
    this.Chainblocks = AddBlock(newBlock, this) || this.Chainblocks

    // clear pending transactions
    this.PendingTransactions = []
  }

  IsValid() {
    const allHashs = this.Chainblocks.map(chainblock => chainblock.hash)
    let ok = true
    this.Chainblocks.forEach((chainblock) => {
      const { block } = chainblock
      // each block should be valid
      if (!block.IsValid()) {
        Debug(`ERROR Invalid block found: ${block}`)
        Debug(`ERROR Block: ${block}`)
        ok = false
        return
      }
      // has of block should be same as stored hash
      if (block.Blockhash() !== chainblock.hash) {
        Debug(`ERROR Blockhash is not same as stored (${chainblock.hash})`)
        Debug(`ERROR Block: ${block}`)
        ok = false
        return
      }
      // previous hash must be in blockchain (expect genesis block with height 0)
      if (chainblock.height !== 0 && !allHashs.includes(block.PrevHash)) {
        Debug(`ERROR Previous hash ${block.PrevHash} of block is not in blockchain`)
        Debug(`ERROR Block: ${block}`)
        ok = false
      }
    })
    return ok
  }

  toString() {
    return JSON.stringify(this)
  }

  static CreateWallet(name) {
    return new Wallet(name)
  }

  GetBalance(wallet) {
    if (!Wallet.CheckIsWallet(wallet)) return 'ERROR: argument must be a Wallet'
    return wallet.GetBalance(this.Chainblocks)
  }
}

module.exports = Blockchain
