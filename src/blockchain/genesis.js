const Message = require('./message.js')
const Block = require('./block.js')
const ChainLink = require('./chainlink.js')
const { Cst, CstError } = require('./const.js')
const Debug = require('debug')('blockjs:genesis')

const { Db: { Docs: CstDocs } } = Cst

const CreateGenesisBlock = () => {
  const GenesisMsg = Message.CreateFromContent(Cst.GenesisAddress, Cst.GenesisMsg)
  return Block.Create(null, 0, Cst.StartDiff, [GenesisMsg], Cst.GenesisTimestamp)
}
const CreateFirstLink = () =>
  new Promise((resolve, reject) => {
    const GenesisBlock = CreateGenesisBlock()
    if (!GenesisBlock) { return reject(new Error(CstError.GenesisNotCreated)) }

    ChainLink.Create(GenesisBlock, 0)
      .then(link => resolve(link))
      .catch(err => reject(err))
  })

const CreateBlockchain = async (BlockChain) => {
  try {
    // no links in database = no genesis block (first run?)
    // create blockchain by adding genesis block
    const FirstLink = await CreateFirstLink()
    Debug('Save genesis in Db')
    await BlockChain.Db.Add(CstDocs.Blockchain, FirstLink)
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(`${CstError.GenessisNotAdded} : ${err}`))
  }
}

const BlockExistInDb = async (BlockChain) => {
  try {
    const link = await BlockChain.Db.Find(CstDocs.Blockchain, { Height: 0 })
    if (link.length === 0) {
      await CreateBlockchain(BlockChain)
      return Promise.resolve()
    }
    // check if first block is genesis block (verify hash = genesis hash)
    const [firstLink] = link
    const genesisBlock = Block.ParseFromDb(firstLink.Block)
    if (genesisBlock.Blockhash() !== Cst.GenesisHashBlock) {
      return Promise.reject(new Error(CstError.GenessisNotFirst))
    }
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(`${CstError.GenessisNotAdded}: ${err}`))
  }
}

module.exports = { BlockExistInDb, CreateBlockchain }
