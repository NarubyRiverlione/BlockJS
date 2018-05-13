
const Block = require('./block.js')
const Debug = require('debug')('blockjs:Chainlink')

class ChainLink {
  constructor(block, newHeight) {
    if (block instanceof Block === false) {
      Debug('ERROR AddBlock: argument is not a Block')
      return null
    }
    if (!block.IsValid()) {
      Debug('ERROR AddBlock: block is not valid')
      return null
    }
    // if (block.PrevHash !== blockchain.GetHash()) {
    //   Debug('ERROR AddBlock: previous hash of block is not lastest hash in blockchain')
    //   return null
    // }

    this.Height = newHeight
    this.Hash = block.Blockhash()
    this.Block = block
  }

  AddToChain(blockchain) {
    const newBlockchain = [].concat(...blockchain, this)
    return newBlockchain
  }
}

module.exports = ChainLink
