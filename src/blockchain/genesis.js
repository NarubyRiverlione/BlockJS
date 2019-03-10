const Debug = require('debug')('blockjs:genesis')

const Message = require('./message.js')
const Block = require('./block.js')
const { Cst, CstError } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

const CreateGenesisBlock = async () => {
  try {
    const GenesisMsg = await Message.Create(Cst.GenesisAddress, Cst.GenesisMsg, Cst.GenesisMsgId)
    return await Block.Create(null, 0,
      Cst.GenesisNonce, Cst.GenesisDiff, [GenesisMsg],
      Cst.GenesisTimestamp)
  } catch (err) { Debug(err.message); return null }
}


const CreateBlockchain = async (BlockChain) => {
  try {
    // create blockchain by adding genesis block
    const GenesisBlock = await CreateGenesisBlock()
    Debug('Save genesis in Db')
    return await GenesisBlock.Save(BlockChain.Db)
  } catch (err) {
    return Promise.reject(new Error(`${CstError.GenessisNotAdded} : ${err}`))
  }
}

const ExistInDb = BlockChain => (
  new Promise(async (resolve, reject) => {
    try {
      const FirstBlocks = await BlockChain.Db.Find(CstDocs.Blockchain, { Height: 0 })

      if (FirstBlocks.length > 1) {
        return reject(new Error(`${CstError.MultiBlocks}`))
      }
      // no blocks in database = no genesis block (first run?)
      if (FirstBlocks.length === 0) {
        const result = await CreateBlockchain(BlockChain)
        return resolve(result)
      }

      // check if first block is genesis block (verify hash = genesis hash)
      const [FirstDbBlock] = FirstBlocks
      const FirstBlock = await Block.ParseFromDb(FirstDbBlock)
      if (!FirstBlock) return reject(new Error(CstError.ParseBlock))

      if (FirstBlock.Hash !== Cst.GenesisHashBlock) {
        return reject(new Error(CstError.GenessisNotFirst))
      }
      return resolve(true)
    } catch (err) {
      Debug(err.message)
      return reject(new Error(`${CstError.GenessisNotAdded}`))
    }
  })
)

module.exports = { ExistInDb, CreateBlockchain }
