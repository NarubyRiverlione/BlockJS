/* ChainLink =  Height, Hash (of block) , Block (header + content)  */
const { CstError } = require('../Const')
const Block = require('./block.js')
// const Debug = require('debug')('blockjs:Chainlink')

class ChainLink {
  static Create(block, newHeight) {
    return new Promise((resolve, reject) => {
      if (block instanceof Block === false) { return reject(new Error(CstError.NotBlock)) }

      if (!Block.IsValid(block)) { return reject(new Error(CstError.BlockInvalid)) }
      // if (block.PrevHash !== blockchain.GetBestHash()) {
      //   Debug('ERROR AddBlock: previous hash of block is not latest hash in blockchain')
      //   return null
      // }
      return resolve(new ChainLink(block, newHeight))
    })
  }

  constructor(block, newHeight) {
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
