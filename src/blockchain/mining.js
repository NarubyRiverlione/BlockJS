const Debug = require('debug')('blockjs:mine')
const Block = require('./block.js')

const { Cst, CstError, CstTxt } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

// target is string of amount of numbers equal to the difficulty
// ex. diff=4 --> target ='0123'
const CreateTarget = (diff) => {
  let target = ''
  for (let digit = 0; digit < diff; digit += 1) {
    target = target.concat(digit)
  }
  return target
}

// Proof-of-work: find hash that starts with the target
const Pow = (prevHash, height, diff, PendingMessages, Timestamp) => {
  const Target = CreateTarget(diff)
  let nonce = 0
  let TestBlock = null

  do {
    TestBlock = Block.Create(prevHash, height, nonce, Cst.StartDiff, PendingMessages, Timestamp) // eslint-disable-line max-len
    nonce += 1
  } while (TestBlock.Blockhash().slice(0, diff) !== Target)

  return TestBlock
}

// create new block with all pending messages
const MineBlock = async (BlockChain) => {
  const syncing = await BlockChain.CheckSyncingNeeded()
  if (syncing) return (CstError.MineNotSync)

  const { Db } = BlockChain
  const PendingMessages = await Db.Find(CstDocs.PendingMessages, {})

  // create block
  // TODO: POW / POS
  // TODO: set Max of TX in block
  const prevHash = await BlockChain.GetBestHash()
  const height = await BlockChain.GetHeight()
  const StartMintingTime = Date.now()
  const MintedBlock = Pow(prevHash, height + 1, Cst.StartDiff, PendingMessages, Date.now())
  const MintingTime = (Date.now() - StartMintingTime) / 1000.0
  Debug(`${CstTxt.MiningFoundBlock} ${MintedBlock.Nonce} atemp's in ${MintingTime} sec`)
  // const createdBlock = Block.Create(prevHash, height + 1, 0, Cst.StartDiff, PendingMessages, Date.now()) // eslint-disable-line max-len
  // save block to blockchain
  await BlockChain.Db.Add(CstDocs.Blockchain, MintedBlock)
  // broadcast new block
  BlockChain.P2P.Broadcast(Cst.P2P.BLOCK, MintedBlock)
  // clear pending messages
  // TODO: only remove msg's that are added in BlockChain block (once Max of TX are set)
  // TODO: instead of removing, mark as 'processed' so there available in case of forks
  await BlockChain.Db.RemoveAllDocs(CstDocs.PendingMessages)

  return (MintedBlock)
}

module.exports = { MineBlock }
