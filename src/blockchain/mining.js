const Block = require('./block.js')
const ChainLink = require('./chainlink.js')
const Cst = require('./const.js')
const Debug = require('debug')('blockjs:mining')
const Transactions = require('./transaction.js')

const CstDocs = Cst.Db.Docs


// create new block with all pending transactions
const MineBlock = async (coin, miningReward) => {
  const syncing = await coin.CheckSyncingNeeded()
  if (syncing) return ('Cannot mine a block, coin node needs syncing')

  const { Db } = coin
  const minerAddress = coin.Wallet.Address


  const PendingTransactions = await Db.Find(CstDocs.PendingTransactions, {})

  // Coinbase transaction as mining reward
  const CoinbaseTX = await Transactions.Create(null, minerAddress, miningReward, true)
  // add coinbaseTX as first TX for the new block
  const IncludeTXs = [CoinbaseTX].concat(PendingTransactions)

  // create block
  // TODO: POW / POS
  // TODO: set Max of TX in block
  const prevHash = await coin.GetBestHash()
  const createdBlock = await Block.Create(prevHash, 0, Cst.StartDiff, IncludeTXs, Date.now()) // eslint-disable-line max-len
  const height = await coin.GetHeight()
  // create new link with block
  const newLink = await ChainLink.Create(createdBlock, height + 1)
  // save link to blockchain
  await coin.Db.Add(CstDocs.Blockchain, newLink)

  /*  check if block contains receiving transactions for this wallet */
  // should be at least 1: the coinbase TX
  // save tx(s) to OwnTX & update balance
  const newBalance = await coin.Wallet.IncomingBlock(createdBlock, Db)
  Debug(`Updated balance form this block: ${newBalance}`)

  // // add mining reward to wallet
  // await coin.ChangeBalance(miningReward)
  // // save coinbase tx as ownTX
  // await coin.SaveOwnTx(CoinbaseTX)

  // broadcast new block
  coin.P2P.Broadcast(Cst.P2P.BLOCK, createdBlock)


  // clear pending transactions
  // TODO: only remove tx's that are added in coin block (once Max of TX are set)
  // TODO: instead of removing, mark as 'processed' so there available in case of forks
  await coin.Db.RemoveAllDocs(CstDocs.PendingTransactions)

  return (createdBlock)
}

module.exports = { MineBlock }
