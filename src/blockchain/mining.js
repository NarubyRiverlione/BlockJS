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
const Pow = async (PendingMessages, BlockChain) => {
  const prevHash = await BlockChain.GetBestHash()
  const height = await BlockChain.GetHeight()
  const diff = await BlockChain.GetDiff()
  const Timestamp = Date.now()

  // target is consecutive numbers
  const Target = CreateTarget(diff)
  let nonce = 0
  let TestBlock = null

  // increment the nonce until the start of the block hash is equal to the target
  do {
    TestBlock = Block.Create(prevHash, height + 1, nonce, diff, PendingMessages, Timestamp) // eslint-disable-line max-len
    nonce += 1

    // stop PoW when Mining flag is false
    // stop when start of the block hash is the target
  } while (TestBlock.Blockhash().slice(0, diff) !== Target && BlockChain.GetMining())

  return TestBlock
}

// create new block with all pending messages
const MineBlock = async (BlockChain) => {
  const syncing = await BlockChain.CheckSyncingNeeded()
  if (syncing) return (CstError.MineNotSync)

  // set flag currently mining
  BlockChain.SetMining(true)

  const { Db } = BlockChain
  const PendingMessages = await Db.Find(CstDocs.PendingMessages, {})

  // create block
  const StartMintingTime = Date.now()

  const MintedBlock = await Pow(PendingMessages, BlockChain)

  // check if mining was aborted (ex. a new block was received via p2p)
  if (!BlockChain.GetMining()) {
    Debug(CstTxt.MiningAborted)
    return null
  }
  const MintingTime = (Date.now() - StartMintingTime) / 1000.0
  const HashSec = MintedBlock.Nonce / MintingTime / 1000

  Debug(`${CstTxt.MiningFoundBlock} ${MintedBlock.Nonce} attempts in ${MintingTime.toFixed(1)} sec = ${HashSec.toFixed(1)} kHash/s`)

  // save block to blockchain
  await BlockChain.Db.Add(CstDocs.Blockchain, MintedBlock)

  // clear flag currently mining
  BlockChain.SetMining(false)

  // broadcast new block
  BlockChain.P2P.Broadcast(Cst.P2P.BLOCK, MintedBlock)

  // clear pending messages
  // TODO: only remove msg's that are added in BlockChain block (once Max of TX are set)
  // TODO: instead of removing, mark as 'processed' so there available in case of forks
  await BlockChain.Db.RemoveAllDocs(CstDocs.PendingMessages)

  return (MintedBlock)
}

module.exports = { MineBlock }
