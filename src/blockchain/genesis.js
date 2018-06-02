
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

const CreateFirstLink = () =>
  new Promise((resolve, reject) => {
    CreateGenesisBlock()
      .then(GenesisBlock => resolve(ChainLink.Create(GenesisBlock, 0)))
      .catch(err => reject(err))
  })

const BlockExistInDb = Db =>
  new Promise((resolve, reject) => {
    // TODO check genesis tx
    Db.Find(CstDocs.Blockchain, { Height: 0 })
      .catch(err => reject(err))
      .then(firstLink =>
        resolve(firstLink.length !== 0))
  })

const CreateBlockchain = Db =>
  new Promise((resolve, reject) => {
    let FirstLink
    // no links in database = no genesis block (first run?)
    // create blockchain by adding genesis block
    CreateFirstLink()
      .then((link) => {
        FirstLink = link
        Debug('Save genesis in Db')
        return Db.Add(CstDocs.Blockchain, FirstLink)
      })
      .then(() => resolve(FirstLink))
      .catch(err => reject(new Error(`ERROR cannot create/save genesis block: ${err}`)))
  })

module.exports = { BlockExistInDb, CreateBlockchain }
