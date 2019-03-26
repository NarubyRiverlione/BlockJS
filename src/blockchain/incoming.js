const Debug = require('debug')('blockjs:incoming')

const { ParseMessageFromDb, IsMessageValid } = require('./message.js')
const { ParseBlockFromDb, IsValidBlock } = require('./block.js')

const { Cst, CstTxt, CstError } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

// find the height of a block in the blockchain
const GetHeightOfBlock = (hash, db) => new Promise(async (resolve, reject) => {
  // const hash = await block.GetBlockHash()
  db.Find(CstDocs.Blockchain, { Hash: hash })
    .catch(err => reject(err))
    .then((foundLink) => {
      if (foundLink.length > 1) return reject(new Error(`Multiple blocks found with hash ${hash}`))
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

/* New top block :
==> add incoming as new top block in local blockchain copy
==> clear pending messages collection
==> stop mining as pending messages are in the new block
==> forward block to know peers
 */
const BlockIsNewTop = async (newBlock, BlockChain, formPeer) => {
  Debug('---- Incoming block is new top of blockchain')
  if (BlockChain.Mining) {
    Debug('---- Stop if currently mining, an other peer was faster in finding the PoW solution')
    BlockChain.SetCurrentMining(false)
  }
  // TODO: remove only pending TX that are in this block
  Debug('---- Clear all pending messages')
  await BlockChain.Db.RemoveAllDocs(CstDocs.PendingMessages)
  // forward new block to peers
  Debug('---- Forward the block to all peers, except the peer that send this block')
  BlockChain.P2P.Broadcast(Cst.P2P.BLOCK, newBlock, formPeer)
}

/* evaluate a block: is this a needed block during sync or the new top of blockchain
--> add to blockchain
--> remove in db collection IncomingBlocks
*/
const EvaluateBlock = async (inboundBlock, syncing, BlockChain, formPeer) => {
  try {
    const newBlock = await ParseBlockFromDb(inboundBlock)

    if (!newBlock) return (CstError.ParseBlock)
    const { Db } = BlockChain


    /*  check if block is already in blockchain
        --> yes: remove from incoming blocks as it doesn't need to be processed */
    const foundBlock = await BlockChain.GetBlockWithHash(newBlock.Hash)
    if (foundBlock) {
      Debug('-- Have already this incoming block, skip evaluation')
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

    /* previous block is known, determine his height via previous block height */
    const prevHeight = await GetHeightOfBlock(prevBlock.Hash, Db)
    Debug(`-- Previous height is ${prevHeight}`)
    // new height = next height based on previous block
    const newHeight = prevHeight + 1
    Debug(`-- ${CstTxt.IncomingBlockNewHeight} ${newHeight}`)
    newBlock.Height = newHeight

    // add block to the blockchain
    Debug('-- save block in blockchain')
    await newBlock.Save(Db)

    // not syncing & receiving a block => must be a new top block
    // execute extra actions
    if (!syncing) {
      await BlockIsNewTop(newBlock, BlockChain, formPeer)
      // not syncing, no need to change IncomingBlocks collection, stop evaluating
      return true
    }

    /* remove block from incoming list, return resolved message */
    Debug('-- remove block from IncomingBlocks')
    const removeResult = await RemoveIncomingBlock(newBlock.PrevHash, Db,
      (`-- ${CstTxt.Block} ${newBlock.Hash} ${CstTxt.IncomingBlockAdded}`))
    return removeResult
  } catch (err) { Debug(err.message); return err }
}

// all needed block are stored
// now evaluate them (check prevHash,.., store valid block in local blockchain copy)
const ProcessReceivedBlocks = async (BlockChain, formPeer) => {
  // recursive until all blocks are evaluated
  const processBlocksPromise = []

  const inboundBlocks = await BlockChain.Db.Find(CstDocs.IncomingBlocks, {})
  inboundBlocks.forEach((inboundBlock) => {
    processBlocksPromise.push(EvaluateBlock(inboundBlock, true, BlockChain, formPeer))
  })

  Promise.all(processBlocksPromise)
    .then(async (result) => {
      Debug(`- ${CstTxt.IncomingBlockProcessResult} ${result}`)
      // check if syncing is done (all blocks are evaluated)
      const stillSyncing = BlockChain.Syncing() || await BlockChain.Db.CountDocs(CstDocs.IncomingBlocks) > 0
      if (stillSyncing) {
        Debug(`- ${CstTxt.IncomingBlockReprocess}`)
        ProcessReceivedBlocks(BlockChain)
      } else {
        Debug(`- ${CstTxt.IncomingBlockAllProcessed}`)
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
const Block = async (inboundBlock, BlockChain, formPeer) => {
  const newBlock = await ParseBlockFromDb(inboundBlock)
  const Valid = await IsValidBlock(newBlock)
  if (!newBlock || !Valid) {
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

  // check if syncing
  if (!BlockChain.Syncing()) {
    Debug('Received a block and wasn`t syncing, only need to evaluate this one block')
    EvaluateBlock(newBlock, false, BlockChain, formPeer)
    return (CstTxt.IncomingBlocksEvaluatedDone)
  }

  // remove hash of stored block from needed list
  // const UpdatedNeeded = !BlockChain.NeededHashes.has(newBlock.Hash)
  BlockChain.RemoveFromNeededHashes(newBlock.Hash)
  const AmountNeeded = BlockChain.NeededHashes.size
  // still need other block before they can be evaluated ?
  if (AmountNeeded > 0) {
    return (`Still need  ${AmountNeeded} blocks, wait for evaluating them`)
  }

  // needed list empty ->  process stored blocks
  Debug(CstTxt.IncomingBlockAllReceived)
  await ProcessReceivedBlocks(BlockChain, formPeer)

  return (CstTxt.IncomingBlocksEvaluatedDone)
}

// store incoming message as pending for block if this not already in the PendingMessage local db
const Msg = async (msg, BlockChain) => {
  const message = ParseMessageFromDb(msg)

  // is the Transaction complete ?
  if (!IsMessageValid(message)) {
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
