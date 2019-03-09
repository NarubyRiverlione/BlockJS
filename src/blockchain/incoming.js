const Debug = require('debug')('blockjs:incoming')

const Message = require('./message.js')
const Blocks = require('./block.js')

const { Cst, CstTxt, CstError } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

// find the height of a block in the blockchain
const GetHeightOfBlock = (block, db) => new Promise(async (resolve, reject) => {
  const hash = await block.GetBlockHash()
  db.Find(CstDocs.Blockchain, { Hash: hash })
    .catch(err => reject(err))
    .then((foundLink) => {
      if (foundLink.length > 1) return reject(new Error(`Multiple blocks found with hash ${block.Blockchain()}`))
      if (foundLink.length === 0) return resolve(null)
      return resolve(foundLink[0].Height)
    })
})

// remove block in db form Incoming collection
const RemoveIncomingBlock = (prevHash, db, resolveMsg) => new Promise((resolve, reject) => {
  const filter = { PrevHash: prevHash }
  db.RemoveOne(CstDocs.IncomingBlocks, filter)
    .then(() => resolve(resolveMsg))
    .catch(err => reject(err))
})

/* Blockchain is synced and incoming block
--> check if prevHash of incoming block is last hash in block chain
==> yes = add incoming as new top block ==> clear pending messages ==> top if currently mining
 */
const CheckIfBlockIsNewTop = async (newBlock, BlockChain) => {
  const amountNeededEvaluation = await BlockChain.Db.CountDocs(CstDocs.IncomingBlocks)
  const amountNeededHashes = BlockChain.NeededHashes.length
  // check if this is a new block in the chain
  if (amountNeededEvaluation === 1 && amountNeededHashes === 0) {
    Debug('Incoming block is new top of blockchain')
    Debug('-- Stop mining')
    BlockChain.SetMining(false)
    // TODO: remove only pending TX that are in this block
    Debug('-- Clear all pending messages')
    await BlockChain.Db.RemoveAllDocs(CstDocs.PendingMessages)
    // forward new block to peers
    BlockChain.P2P.Broadcast(Cst.P2P.BLOCK, newBlock)
  }
}

/* if block is needed or new on top of blockchain
--> add to blockchain
--> remove in db collection IncomingBlocks
*/
const EvaluateBlock = async (inboundBlock, BlockChain) => {
  const newBlock = Blocks.ParseFromDb(inboundBlock)
  if (!newBlock) return (CstError.ParseBlock)
  const blockhash = await newBlock.GetBlockHash()
  const { Db } = BlockChain

  /*  check if block is already in blockchain
      --> yes: remove from incoming blocks as it doesn't need to be processed */
  const foundBlock = await BlockChain.GetBlockWithHash(blockhash)
  if (foundBlock) {
    const removeKnownBlockResult = RemoveIncomingBlock(
      newBlock.PrevHash,
      Db, CstTxt.IncomingBlockAlreadyKnow,
    )
    return removeKnownBlockResult
  }

  /* try get previous block to determine of block is known in the blockchain?  */
  const prevBlock = await BlockChain.GetBlockWithHash(newBlock.PrevHash)
  if (!prevBlock) {
    // reevaluated when other incoming blocks are evaluated (and added)
    // probably the previous block at that time be know
    return (CstTxt.IncomingBlockPrevNotKnown)
  }

  await CheckIfBlockIsNewTop(newBlock, BlockChain)

  /* previous block is known, determine his height via previous block height */
  const prevHeight = await GetHeightOfBlock(prevBlock, Db)
  // new height = next height based on previous block
  const newHeight = prevHeight + 1
  Debug(`${CstTxt.IncomingBlockNewHeight} ${newHeight}`)
  newBlock.Height = newHeight
  // add block to the blockchain
  await Db.Add(CstDocs.Blockchain, newBlock)

  /* remove block from incoming list, return resolved message */
  const removeResult = await RemoveIncomingBlock(newBlock.PrevHash, Db,
    (`${CstTxt.Block} ${blockhash} ${CstTxt.IncomingBlockAdded}`))
  return removeResult
}

// all needed block are stored, now process them (check prevHash,..)
// recursive until all blocks are evaluated
const ProcessReceivedBlocks = async (BlockChain) => {
  const processBlocksPromise = []

  const inboundBlocks = await BlockChain.Db.Find(CstDocs.IncomingBlocks, {})
  inboundBlocks.forEach((inboundBlock) => {
    processBlocksPromise.push(EvaluateBlock(inboundBlock, BlockChain))
  })

  Promise.all(processBlocksPromise)
    .then(async (result) => {
      Debug(`${CstTxt.IncomingBlockProcessResult} ${result}`)
      // check if syncing is done (all blocks are evaluated)
      const syncing = await BlockChain.CheckSyncingNeeded()
      if (syncing) {
        Debug(CstTxt.IncomingBlockReprocess)
        ProcessReceivedBlocks(BlockChain)
      } else {
        Debug(CstTxt.IncomingBlockAllProcessed)
      }
    })
    .catch(err => console.error(err))
}

/* evaluate incoming best hash from peer
 hash is known   -->  send inventory message with hashes from
                      the received has to the last know as response
 hash is unknown --> nothing to do, wait for message(s) with all
                      hashes form node(s) that have a complete(r) blockchain
*/
const Hash = async (inboundHash, BlockChain) => {
  const block = await BlockChain.GetBlockWithHash(inboundHash)
  if (!block) {
    Debug(CstTxt.IncomingHashNeedsSync)
    return []
  }
  Debug(CstTxt.IncomingHashKnown)
  const HashesNeededByPeer = await BlockChain.GetHashesFromBestTo(inboundHash)
  return HashesNeededByPeer
}

// store incoming block until all requests are received, the process block(s)
const Block = async (inboundBlock, BlockChain) => {
  const newBlock = Blocks.ParseFromDb(inboundBlock)
  if (!newBlock || !Blocks.IsValid(newBlock)) {
    return (new Error(CstTxt.IncomingBlockInvalid))
  }

  // check if incoming block is already stored
  const filter = { PrevHash: newBlock.PrevHash }
  const alreadyStored = await BlockChain.Db.FindOne(CstDocs.IncomingBlocks, filter)
  if (alreadyStored) {
    Debug(CstTxt.IncomingBlockAlreadyKnow)
  } else {
    // save block as incoming, to be evaluated when all needed blocks are received
    Debug(CstTxt.IncomingBlockStored)
    await BlockChain.Db.Add(CstDocs.IncomingBlocks, newBlock)
  }

  // remove hash of stored block for needed list
  const newHash = await newBlock.GetBlockHash()
  const updatedNeeded = BlockChain.NeededHashes.filter(needed => needed !== newHash)

  // update NeededHashes
  BlockChain.UpdateNeededHashes(updatedNeeded)
  // still need other block before they can be evaluated ?
  Debug(`Still need  ${updatedNeeded.length} blocks`)
  if (updatedNeeded.length !== 0) {
    return (CstTxt.IncomingBlockStored)
  }

  // needed list empty ->  process stored blocks
  Debug(CstTxt.IncomingBlockAllReceived)
  await ProcessReceivedBlocks(BlockChain)

  // TODO: forward validated block to know P2P
  return (CstTxt.IncomingBlocksEvaluated)
}

// store incoming message as pending for block if this not already in the PendingMessage local db
const Msg = async (msg, BlockChain) => {
  const message = Message.ParseFromDb(msg)

  // is the Transaction complete ?
  if (!Message.IsValid(message)) {
    return Promise.reject(new Error(CstError.SendNoValid))
  }
  // check if incoming message is already stored
  const filter = { Hash: message.Hash }
  const alreadyStored = await BlockChain.Db.FindOne(CstDocs.PendingMessages, filter)
  if (!alreadyStored) {
    // save to local db for mining later
    await message.Save(BlockChain.Db)
    return message
  }
  return null
}
module.exports = { Hash, Block, Msg }
