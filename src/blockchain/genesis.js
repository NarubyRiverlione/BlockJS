
const Transaction = require('./transaction.js')
const Block = require('./block.js')
const ChainLink = require('./chainlink.js')
const Cst = require('./const.js')
const Debug = require('debug')('blockjs:genesis')

const CstDocs = Cst.Db.Docs
const CreateGenesisBlock = () => {
  // coinBase TX = true
  const GenesisTX = new Transaction(null, Cst.GenesisAddress, Cst.GenesisReward, true)
  return Block.Create(null, 0, Cst.StartDiff, [GenesisTX], Cst.GenesisTimestamp)
}
const CreateFirstLink = () => {
  const GenesisBlock = CreateGenesisBlock()
  if (!GenesisBlock) { return Promise.reject(new Error('Could not create genesis block')) }
  const link = ChainLink.Create(GenesisBlock, 0)
  return link
}

const CreateBlockchain = async (coin) => {
  try {
    // no links in database = no genesis block (first run?)
    // create blockchain by adding genesis block
    const FirstLink = CreateFirstLink()
    Debug('Save genesis in Db')
    await coin.Db.Add(CstDocs.Blockchain, FirstLink)
    // save to ownTX is wallet = Genesis address
    if (coin.Wallet.Address === Cst.GenesisAddress) {
      const GenesisTxHash = FirstLink.Block.Transactions[0].Hash
      await coin.Wallet.SaveOwnTX(GenesisTxHash, coin.Db)
      // set genesis wallet balance
      await coin.Wallet.CalcBalance(coin.Db)
    }
    return true
  } catch (err) {
    return Promise.reject(new Error(`ERROR cannot create/save genesis block: ${err}`))
  }
}

const BlockExistInDb = async (coin) => {
  try {
    const link = await coin.Db.Find(CstDocs.Blockchain, { Height: 0 })
    if (link.length === 0) { await CreateBlockchain(coin) }
    // check if first block is genesis block (verify hash = genesis hash)
    const [firstLink] = link
    const genesisBlock = Block.ParseFromDb(firstLink.Block)
    if (genesisBlock.Blockhash() !== Cst.GenesisHash) {
      return Promise.reject(new Error('ERROR first block isn\'t not the genesis block'))
    }
    return true
  } catch (err) {
    return Promise.reject(new Error(`ERROR cannot create/save genesis block: ${err}`))
  }
}

module.exports = { BlockExistInDb, CreateBlockchain }
