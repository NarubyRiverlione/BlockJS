const Debug = require('debug')('blockjs:mine')
const { CheckPoW, CreateBlock } = require('./block.js')

const { Cst, CstError, CstTxt } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst


// Proof-of-work: find hash that starts with the target
const Pow = async (prevHash, height, nonce, diff, PendingMessages, Timestamp, cbGetMiningStatus) => {
  try {
    debugger
    const TestBlock = await CreateBlock(prevHash, height, nonce, diff, PendingMessages, Timestamp) // eslint-disable-line max-len
    debugger
    if (!TestBlock) {
      Debug('Cannot create block')
      debugger
      return null
    }

    // check if still mining
    const MiningStatus = cbGetMiningStatus()
    debugger
    if (!MiningStatus) {
      Debug('Need to stop mining')
      debugger
      return null
    }
    if (CheckPoW(diff, TestBlock.Hash)) {
      Debug(CstTxt.MiningFound)
      debugger
      return TestBlock
    }
    return Pow(prevHash, height, nonce + 1, diff, PendingMessages, Timestamp, cbGetMiningStatus)
  } catch (err) {
    Debug(err.message)
    debugger
    return null
  }
}


// create new block with all pending messages
const MineBlock = async (Blockchain) => {
  if (Blockchain.Syncing()) return (CstError.MineNotSync)

  const { Db } = Blockchain
  const PendingMessages = await Db.Find(CstDocs.PendingMessages, {})

  // create block
  const StartMintingTime = Date.now()

  const prevHash = await Blockchain.GetBestHash()
  const height = await Blockchain.GetHeight()
  const diff = await Blockchain.GetDiff()
  const Timestamp = Date.now()
  Debug(`Start finding a block with difficulty ${diff}`)

  // callback to check still mining during PoW
  const GetMiningStatus = () => Blockchain.GetCurrentMining()

  // Find Proof-of-Work solution
  const CreatedBlock = await Pow(prevHash, height + 1,
    0, diff, PendingMessages, Timestamp, GetMiningStatus)

  const CreatingTime = (Date.now() - StartMintingTime) / 1000.0

  // check if mining was aborted (ex. a new block was received via p2p)
  if (!GetMiningStatus()) {
    Debug(CstTxt.MiningAborted)
    return null
  }
  // clear flag currently mining
  Blockchain.SetCurrentMining(false)

  // show time to find solution and hash rate
  const HashSec = CreatedBlock.Nonce / CreatingTime / 1000

  Debug(`${CstTxt.MiningFoundBlock} after ${CreatedBlock.Nonce} attempts in ${CreatingTime.toFixed(1)} sec = ${HashSec.toFixed(1)} kHash/s`)// eslint-disable-line max-len

  // broadcast new block to all known peers
  Blockchain.P2P.Broadcast(Cst.P2P.BLOCK, CreatedBlock)

  // save block to blockchain
  const result = await CreatedBlock.Save(Db)
  if (!result) return null

  // clear pending messages
  // TODO: only remove msg's that are added in BlockChain block (once Max of TX are set)
  // TODO: instead of removing, mark as 'processed' so there available in case of forks
  await Blockchain.Db.RemoveAllDocs(CstDocs.PendingMessages)

  return (CreatedBlock)
}

module.exports = { MineBlock }
