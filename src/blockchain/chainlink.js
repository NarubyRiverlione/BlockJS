/* ChainLink =  Height, Hash (of block) , Block (header + content)  */

const Block = require('./block.js')
// const Debug = require('debug')('blockjs:Chainlink')

class ChainLink {
  static Create(block, newHeight) {
    return new Promise((resolve, reject) => {
      if (block instanceof Block === false) { return reject(new Error('ERROR AddBlock: argument is not a Block')) }

      if (!Block.IsValid(block)) { return reject(new Error('ERROR AddBlock: block is not valid')) }
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
