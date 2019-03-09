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
const Pow = async (Target, prevHash, height, nonce, diff, PendingMessages, Timestamp) => {
  const TestBlock = Block.Create(prevHash, height, nonce, diff, PendingMessages, Timestamp) // eslint-disable-line max-len
  const TestHash = await TestBlock.GetBlockHash()
  const TestTarget = TestHash.slice(0, diff)
  if (TestTarget === Target) {
    console.log('Found it')
    return TestBlock
  }
  return Pow(Target, prevHash, height, nonce + 1, diff, PendingMessages, Timestamp)
}


// create new block with all pending messages
const MineBlock = async (BlockChain) => {
  const syncing = await BlockChain.CheckSyncingNeeded()
  if (syncing) return (CstError.MineNotSync)

  // // set flag currently mining
  // BlockChain.SetMining(true)

  const { Db } = BlockChain
  const PendingMessages = await Db.Find(CstDocs.PendingMessages, {})

  // create block
  const StartMintingTime = Date.now()

  const prevHash = await BlockChain.GetBestHash()
  const height = await BlockChain.GetHeight()
  const diff = await BlockChain.GetDiff()
  const Timestamp = Date.now()
  Debug(`Start finding a block with difficulty ${diff}`)

  // target is consecutive numbers
  const Target = CreateTarget(diff)
  const nonce = 0
  const CreatedBlock = await Pow(Target, prevHash, height + 1, nonce, diff, PendingMessages, Timestamp)
  // const CreatedBlock = await Pow(PendingMessages, BlockChain)
  const CreatingTime = (Date.now() - StartMintingTime) / 1000.0
  const HashSec = CreatedBlock.Nonce / CreatingTime / 1000

  Debug(`${CstTxt.MiningFoundBlock} after ${CreatedBlock.Nonce} attempts in ${CreatingTime.toFixed(1)} sec = ${HashSec.toFixed(1)} kHash/s`)
  // debugger

  // check if mining was aborted (ex. a new block was received via p2p)
  if (!BlockChain.Mining) {
    Debug(CstTxt.MiningAborted)
    return null
  }
  // clear flag currently mining
  BlockChain.SetMining(false)

  // broadcast new block
  BlockChain.P2P.Broadcast(Cst.P2P.BLOCK, CreatedBlock)

  // save block to blockchain
  const result = await CreatedBlock.Save(Db)
  if (!result) return null

  // clear pending messages
  // TODO: only remove msg's that are added in BlockChain block (once Max of TX are set)
  // TODO: instead of removing, mark as 'processed' so there available in case of forks
  await BlockChain.Db.RemoveAllDocs(CstDocs.PendingMessages)

  return (CreatedBlock)
}

module.exports = { MineBlock }
