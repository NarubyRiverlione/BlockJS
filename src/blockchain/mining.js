const Block = require('./block.js')
const ChainLink = require('./chainlink.js')
const Cst = require('./const.js')
const Debug = require('debug')('blockjs:mining')

const CstDocs = Cst.Db.Docs

// create new block with all pending transactions
const MineBlock = async (coin) => {
  const syncing = await coin.CheckSyncingNeeded()
  if (syncing) return ('Cannot mine a block, coin node needs syncing')

  const { Db } = coin

  const PendingTransactions = await Db.Find(CstDocs.PendingTransactions, {})
  // TODO: before adding check each tx: valid ? balance ?

  const prevHash = await coin.GetBestHash()
  // create block

  // TODO: POW / POS
  // TODO: set Max of TX in block
  const createdBlock = await Block.Create(prevHash, 0, Cst.StartDiff, PendingTransactions, Date.now()) // eslint-disable-line max-len

  const height = await coin.GetHeight()
  // create new link with block
  const newLink = await ChainLink.Create(createdBlock, height + 1)

  // save link to blockchain
  await coin.Db.Add(CstDocs.Blockchain, newLink)

  // TODO: broadcast new block

  // clear pending transactions
  // TODO: only remove tx's that are added in coin block (once Max of TX are set)
  // TODO: instead of removing, mark as 'processed' so there available in case of forks
  await coin.Db.RemoveAllDocs(CstDocs.PendingTransactions)

  return (createdBlock)
}

module.exports = { MineBlock }
