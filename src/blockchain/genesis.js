
const Message = require('./message.js')
const Block = require('./block.js')
const ChainLink = require('./chainlink.js')
const Cst = require('./const.js')
const Debug = require('debug')('blockjs:genesis')

const CstDocs = Cst.Db.Docs
const CreateGenesisBlock = () => {
  const GenesisMsg = Message.Create(Cst.GenesisAddress, Cst.GenesisMsg)
  return Block.Create(null, 0, Cst.StartDiff, [GenesisMsg], Cst.GenesisTimestamp)
}
const CreateFirstLink = () =>
  new Promise((resolve, reject) => {
    const GenesisBlock = CreateGenesisBlock()
    if (!GenesisBlock) { return reject(new Error('Could not create genesis block')) }

    ChainLink.Create(GenesisBlock, 0)
      .then(link => resolve(link))
      .catch(err => reject(err))
  })

const CreateBlockchain = async (coin) => {
  try {
    // no links in database = no genesis block (first run?)
    // create blockchain by adding genesis block
    const FirstLink = await CreateFirstLink()
    Debug('Save genesis in Db')
    await coin.Db.Add(CstDocs.Blockchain, FirstLink)
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(`ERROR cannot create/save genesis block: ${err}`))
  }
}

const BlockExistInDb = async (coin) => {
  try {
    const link = await coin.Db.Find(CstDocs.Blockchain, { Height: 0 })
    if (link.length === 0) {
      await CreateBlockchain(coin)
      return Promise.resolve()
    }
    // check if first block is genesis block (verify hash = genesis hash)
    const [firstLink] = link
    const genesisBlock = Block.ParseFromDb(firstLink.Block)
    if (genesisBlock.Blockhash() !== Cst.GenesisHashBlock) {
      return Promise.reject(new Error('ERROR first block isn\'t not the genesis block'))
    }
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(`ERROR cannot create/save genesis block: ${err}`))
  }
}

module.exports = { BlockExistInDb, CreateBlockchain }
