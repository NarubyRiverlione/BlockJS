const Block = require('./Block.js')
// const ChainLink = require('./chainlink.js')
const { Cst } = require('../Const.js')

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
  const height = await BlockChain.GetHeight()
  const createdBlock = Block.Create(prevHash, height + 1, 0, Cst.StartDiff, PendingMessages, Date.now()) // eslint-disable-line max-len
  // save link to blockchain
  await BlockChain.Db.Add(CstDocs.Blockchain, createdBlock)
  // broadcast new block
  BlockChain.P2P.Broadcast(Cst.P2P.BLOCK, createdBlock)
  // clear pending messages
  // TODO: only remove msg's that are added in BlockChain block (once Max of TX are set)
  // TODO: instead of removing, mark as 'processed' so there available in case of forks
  await BlockChain.Db.RemoveAllDocs(CstDocs.PendingMessages)

  return (createdBlock)
}

module.exports = { MineBlock }
