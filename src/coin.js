const Transaction = require('./transaction.js')
const Block = require('./block.js')
const Wallet = require('./wallet.js')
const ChainLink = require('./chainlink.js')
const Cst = require('./const.js')
const Debug = require('debug')('blockjs:blockchain')


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
  const newChainLink = new ChainLink(newHeight, blockhash, block)
  const newBlockchain = [].concat(...blockchain.Blockchain, newChainLink)
  return newBlockchain
})

const CreateGenesisBlock = (() => {
  const GenesisWallet = new Wallet(Cst.GenesisRewardWallet, Cst.GenesisAddress)
  const GenesisTX = new Transaction(null, GenesisWallet, Cst.GenesisReward, true)
  return new Block(null, 0, Cst.StartDiff, [GenesisTX], Cst.GenesisTimestamp)
})


class Coin {
  constructor(version = 1) {
    this.Version = version
    this.BlockReward = Cst.StartBlockReward
    this.PendingTransactions = []

    const genesis = CreateGenesisBlock()

    this.Blockchain = [new ChainLink(0, genesis.Blockhash(), genesis)]
    /* [
      {height, block hash, block}
    ] */
  }
  get Height() {
    const allHeights = this.Blockchain.map(link => link.Height)
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
    const higestlink = this.Blockchain.find(link => link.Height === atHeight)
    return higestlink.Block
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
    this.Blockchain = AddBlock(newBlock, this) || this.Blockchain

    // clear pending transactions
    this.PendingTransactions = []
  }

  IsValid() {
    const allHashs = this.Blockchain.map(link => link.Hash)
    let ok = true
    this.Blockchain.forEach((link) => {
      const { Block: blockInLink } = link
      // each block should be valid
      if (!blockInLink.IsValid()) {
        Debug(`ERROR Invalid block found: ${blockInLink}`)
        Debug(`ERROR Block: ${blockInLink}`)
        ok = false
        return
      }
      // has of block should be same as stored hash
      if (blockInLink.Blockhash() !== link.Hash) {
        Debug(`ERROR Blockhash is not same as stored (${link.Hash})`)
        Debug(`ERROR Block: ${blockInLink}`)
        ok = false
        return
      }
      // previous hash must be in blockchain (expect genesis block with height 0)
      if (link.Height !== 0 && !allHashs.includes(blockInLink.PrevHash)) {
        Debug(`ERROR Previous hash ${blockInLink.PrevHash} of block is not in blockchain`)
        Debug(`ERROR Block: ${blockInLink}`)
        ok = false
      }
    })
    return ok
  }

  toString() {
    return JSON.stringify(this)
  }

  GetBalance(wallet) {
    if (!Wallet.CheckIsWallet(wallet)) return 'ERROR: argument must be a Wallet'
    return wallet.GetBalance(this.Blockchain)
  }


  static CreateWallet(name) {
    return new Wallet(name)
  }

  static CreateTX(senderWallet, recieverWallet, amount) {
    return new Transaction(senderWallet, recieverWallet, amount)
  }
}

module.exports = Coin
