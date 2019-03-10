const Debug = require('debug')('blockjs:mine')
const Block = require('./block.js')

const { Cst, CstError, CstTxt } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst


// target is string of consecutive numbers equal to the difficulty
// ex. diff=4 --> target ='0123'
const CreateTarget = (diff) => {
  let target = ''
  for (let digit = 0; digit < diff; digit += 1) {
    target = target.concat(digit)
  }
  return target
}

// Proof-of-work: find hash that starts with the target
const Pow = async (Target, prevHash, height, nonce, diff, PendingMessages, Timestamp, cbGetMiningStatus) => {
  const TestBlock = await Block.Create(prevHash, height, nonce, diff, PendingMessages, Timestamp) // eslint-disable-line max-len
  // check if still mining
  const MiningStatus = cbGetMiningStatus()
  if (!MiningStatus) {
    Debug('Need to stop mining')
    return null
  }
  // check if valid solution: hash begins with same as target
  const TestTarget = TestBlock.Hash.slice(0, diff)
  if (TestTarget === Target) {
    Debug(CstTxt.MiningFound)
    return TestBlock
  }
  return Pow(Target, prevHash, height, nonce + 1, diff, PendingMessages, Timestamp, cbGetMiningStatus)
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

  // target is amount of consecutive numbers equal to difficulty
  const Target = CreateTarget(diff)
  // callback to check still mining during PoW
  const GetMiningStatus = () => Blockchain.Mining

  // Find Proof-of-Work solution
  const CreatedBlock = await Pow(Target, prevHash, height + 1,
    0, diff, PendingMessages, Timestamp, GetMiningStatus)

  const CreatingTime = (Date.now() - StartMintingTime) / 1000.0

  // check if mining was aborted (ex. a new block was received via p2p)
  if (!Blockchain.Mining) {
    Debug(CstTxt.MiningAborted)
    return null
  }
  // clear flag currently mining
  Blockchain.SetMining(false)

  // show time to find solution and hash rate
  const HashSec = CreatedBlock.Nonce / CreatingTime / 1000
  Debug(`${CstTxt.MiningFoundBlock} after ${CreatedBlock.Nonce} attempts in ${CreatingTime.toFixed(1)} sec = ${HashSec.toFixed(1)} kHash/s`)

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
