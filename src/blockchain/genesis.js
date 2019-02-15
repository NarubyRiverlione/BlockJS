const Debug = require('debug')('blockjs:genesis')

const Message = require('./Message.js')
const Block = require('./Block.js')
// const ChainLink = require('./chainlink.js')
const { Cst, CstError } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

const CreateGenesisBlock = () => {
  const GenesisMsg = Message.Create(Cst.GenesisAddress, Cst.GenesisMsg)
  return Block.Create(null, 0, 0, Cst.StartDiff, [GenesisMsg], Cst.GenesisTimestamp)
}
// const CreateFirstLink = () => {
//   const GenesisBlock = CreateGenesisBlock()
//   if (!GenesisBlock) { return Promise.reject(new Error(CstError.GenesisNotCreated)) }
//   return ChainLink.Create(GenesisBlock, 0)
// }

const CreateBlockchain = async (BlockChain) => {
  try {
    // no links in database = no genesis block (first run?)
    // create blockchain by adding genesis block
    const GenesisBlock = await CreateGenesisBlock()
    Debug('Save genesis in Db')
    await BlockChain.Db.Add(CstDocs.Blockchain, GenesisBlock)
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(`${CstError.GenessisNotAdded} : ${err}`))
  }
}

const BlockExistInDb = async (BlockChain) => {
  try {
    const FirstBlocks = await BlockChain.Db.Find(CstDocs.Blockchain, { Height: 0 })
    if (FirstBlocks.length > 1) {
      return Promise.reject(new Error(`${CstError.MultiBlocks}`))
    }
    if (FirstBlocks.length === 0) {
      await CreateBlockchain(BlockChain)
      return Promise.resolve()
    }
    const [FirstBlock] = FirstBlocks
    // check if first block is genesis block (verify hash = genesis hash)
    const GenesisBlock = Block.ParseFromDb(FirstBlock)
    if (GenesisBlock.Blockhash() !== Cst.GenesisHashBlock) {
      return Promise.reject(new Error(CstError.GenessisNotFirst))
    }
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(`${CstError.GenessisNotAdded}: ${err}`))
  }
}

module.exports = { BlockExistInDb, CreateBlockchain }
