const Block = require('./block.js')
const ChainLink = require('./chainlink.js')
const Cst = require('./const.js')

const CstDocs = Cst.Db.Docs


// create new block with all pending messages
const MineBlock = async (coin) => {
  const syncing = await coin.CheckSyncingNeeded()
  if (syncing) return ('Cannot mine a block, coin node needs syncing')

  const { Db } = coin
  const PendingMessages = await Db.Find(CstDocs.PendingMessages, {})

  // create block
  // TODO: POW / POS
  // TODO: set Max of TX in block
  const prevHash = await coin.GetBestHash()
  const createdBlock = Block.Create(prevHash, 0, Cst.StartDiff, PendingMessages, Date.now()) // eslint-disable-line max-len
  const height = await coin.GetHeight()
  // create new link with block
  const newLink = await ChainLink.Create(createdBlock, height + 1)
  // save link to blockchain
  await coin.Db.Add(CstDocs.Blockchain, newLink)
  // broadcast new block
  coin.P2P.Broadcast(Cst.P2P.BLOCK, createdBlock)
  // clear pending messages
  // TODO: only remove msg's that are added in coin block (once Max of TX are set)
  // TODO: instead of removing, mark as 'processed' so there available in case of forks
  await coin.Db.RemoveAllDocs(CstDocs.PendingMessages)

  return (createdBlock)
}

module.exports = { MineBlock }
