const Block = require('./block.js')
const ChainLink = require('./chainlink.js')
const { Cst } = require('./const.js')

const { Db: { Docs: CstDocs } } = Cst


// create new block with all pending messages
const MineBlock = async (BlockChain) => {
  const syncing = await BlockChain.CheckSyncingNeeded()
  if (syncing) return ('Cannot mine a block, BlockChain node needs syncing')

  const { Db } = BlockChain
  const PendingMessages = await Db.Find(CstDocs.PendingMessages, {})

  // create block
  // TODO: POW / POS
  // TODO: set Max of TX in block
  const prevHash = await BlockChain.GetBestHash()
  const createdBlock = Block.Create(prevHash, 0, Cst.StartDiff, PendingMessages, Date.now()) // eslint-disable-line max-len
  const height = await BlockChain.GetHeight()
  // create new link with block
  const newLink = await ChainLink.Create(createdBlock, height + 1)
  // save link to blockchain
  await BlockChain.Db.Add(CstDocs.Blockchain, newLink)
  // broadcast new block
  BlockChain.P2P.Broadcast(Cst.P2P.BLOCK, createdBlock)
  // clear pending messages
  // TODO: only remove msg's that are added in BlockChain block (once Max of TX are set)
  // TODO: instead of removing, mark as 'processed' so there available in case of forks
  await BlockChain.Db.RemoveAllDocs(CstDocs.PendingMessages)

  return (createdBlock)
}

module.exports = { MineBlock }
