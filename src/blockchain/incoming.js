const Debug = require('debug')('blockjs:incoming')
const CstDocs = require('./const.js').Db.Docs
const Transaction = require('./transaction.js')
const Blocks = require('./block.js')
const ChainLink = require('./chainlink.js')

// find the height of a block in the blockchain
const GetHeightOfBlock = (block, db) =>
  new Promise((resolve, reject) => {
    db.Find(CstDocs.Blockchain, { Hash: block.Blockhash() })
      .catch(err => reject(err))
      .then((foundLink) => {
        if (foundLink.length > 1) return reject(new Error(`Multiple blocks found with hash ${block.Blockchain()}`))
        if (foundLink.length === 0) return resolve(null)
        return resolve(foundLink[0].Height)
      })
  })
// remove block in db form Incoming collection
const RemoveIncomingBlock = (prevHash, db, resolveMsg) =>
  new Promise((resolve, reject) => {
    const filter = { PrevHash: prevHash }
    db.RemoveOne(CstDocs.IncomingBlocks, filter)
      .then(() => resolve(resolveMsg))
      .catch(err => reject(err))
  })


/* amount of blocks that need evaluation = only 1
--> this must be a new block on top of the blockchain
 */
const CheckIfNewTopBlock = async (newBlock, coin) => {
  const amountNeededEvaluation = await coin.Db.CountDocs(CstDocs.IncomingBlocks)
  // check if this is a new block in the chain
  if (amountNeededEvaluation === 1) {
    // new incoming block --> remove all pendingTX
    // TODO: remove only pending TX that are in this block
    await coin.Db.RemoveAllDocs(CstDocs.PendingTransactions)

    // incoming block needed to be the next block in the blockchain
    const bestHash = await coin.GetBestHash()
    if (newBlock.PrevHash !== bestHash) {
      await RemoveIncomingBlock(newBlock.PrevHash, coin.Db, 'Incoming block is not next block in non-sync mode --> ignore block')
    }
  }
}
/* if block is needed or new on top of blockchain
--> add to blockchain
--> check tx's for own address --> update wallet
--> remove in db collection IncomingBlocks
*/
const EvaluateBlock = async (inboundBlock, coin) => {
  const newBlock = Blocks.ParseFromDb(inboundBlock)
  if (!newBlock) return ('ERROR: could not parse block')
  const blockhash = newBlock.Blockhash()
  const { Db } = coin

  /*  check if block is already in blockchain */
  const foundBlock = await coin.GetBlockWithHash(blockhash)
  if (foundBlock) {
    const removeKnownBlockResult = RemoveIncomingBlock(newBlock.PrevHash, Db, 'Incoming block already in blockchain, don\'t need to process')
    return removeKnownBlockResult
  }

  /* only 1 block needs evaluation --> this must be a new block on top of the blockchain */
  // amount of blocks that need evaluation
  await CheckIfNewTopBlock(newBlock, coin)

  /* is previous block known in the blockchain?  */
  // try get previous block
  const prevBlock = await coin.GetBlockWithHash(newBlock.PrevHash)
  if (!prevBlock) {
    return ('Previous block is not in the blockchain, keep block in stored incoming blocks, will need to evaluate again')
  }
  /* previous block is known, determine his height via previous block height */
  const prevHeight = await GetHeightOfBlock(prevBlock, Db)
  // determine new height
  const newHeight = prevHeight + 1
  Debug(`Height if Incoming block will be ${newHeight}`)

  /* create new link with block */
  const newLink = await ChainLink.Create(newBlock, newHeight)
  // add link to the blockchain
  await Db.Add(CstDocs.Blockchain, newLink)

  /*  check if block contains receiving transactions for this wallet */
  // save tx to OwnTX & update balance
  const balance = await coin.Wallet.IncomingBlock(newBlock, coin.Db)
  if (balance) Debug(`Updated balance: ${balance}`)

  /* remove block from incoming list */
  const removeResult = await RemoveIncomingBlock(newBlock.PrevHash, Db, (`Block ${blockhash} added in blockchain`))
  return removeResult
}
// all needed block are stored, now process them (check prevHash,..)
// recursive until all blocks are evaluated
const ProcessReceivedBlocks = async (coin) => {
  const processBlocksPromise = []

  const inboundBlocks = await coin.Db.Find(CstDocs.IncomingBlocks, {})
  inboundBlocks.forEach((inboundBlock) => {
    processBlocksPromise.push(EvaluateBlock(inboundBlock, coin))
  })

  Promise.all(processBlocksPromise)
    .then(async (result) => {
      Debug(`Incoming block processed, results: ${result}`)
      // check if syncing is done (all blocks are evaluated)
      const syncing = await coin.CheckSyncingNeeded()
      if (syncing) {
        Debug('Still needs evaluation')
        ProcessReceivedBlocks(coin)
      } else {
        Debug('All blocks are evaluated')
      }
    })
    .catch(err => console.error(err))
}


// evaluate incoming best hash from peer
// hash is known   --> make Inv message of hashes this node knowns
// hash is unknown --> nothing to do, wait for Inv message
const Hash = async (inboundHash, coin) => {
  const block = await coin.GetBlockWithHash(inboundHash)
  if (!block) {
    Debug('This node needs syncing ! Wait for incoming inv message')
    return []
  }
  Debug('Incoming hash is known, create inv message for peer')
  const HashesNeededByPeer = await coin.GetHashesFromBestTo(inboundHash)
  return HashesNeededByPeer
}
// Store incoming block until all requests are fulfilled, the process block
const Block = async (inboundBlock, coin) => {
  const newBlock = Blocks.ParseFromDb(inboundBlock)
  if (!newBlock || !Blocks.IsValid(newBlock)) {
    return (new Error('Incoming p2p block is not valid'))
  }

  // check if incoming block is already stored
  const filter = { PrevHash: newBlock.PrevHash }
  const alreadyStored = await coin.Db.FindOne(CstDocs.IncomingBlocks, filter)
  if (alreadyStored) {
    Debug('Already received this needed block')
  } else {
    // save block as incoming, to be evaluated when all needed blocks are received
    Debug('Store needed block')
    await coin.Db.Add(CstDocs.IncomingBlocks, newBlock)
  }

  // remove hash of stored block for needed list
  const newHash = newBlock.Blockhash()
  const updatedNeeded = coin.NeededHashes.filter(needed => needed !== newHash)

  // update NeededHashes
  coin.UpdateNeededHashes(updatedNeeded)
  // still need other block before they can be evaluated ?
  Debug(`Still need  ${updatedNeeded.length} blocks`)
  if (updatedNeeded.length !== 0) {
    return ('Incoming block stored')
  }

  // needed list empty ->  process stored blocks
  Debug('Got all needed blocks, process stored blocks now')
  await ProcessReceivedBlocks(coin)
  return ('All stored blocks are evaluated')
}
// store incoming transaction as pending
const Tx = (txMsg, coin) => {
  const tx = new Transaction(
    { Address: txMsg.FromAddress }, // fromWallet format
    txMsg.ToAddress,
    txMsg.Amount,
    txMsg.CoinBaseTX,
  )
  // is the Transaction complete ?
  if (!Transaction.IsValid(tx)) {
    return Promise.reject(new Error('SendTX: transaction is not valid'))
  }
  // TODO: before adding check each tx: valid balance ?

  // save to local db for mining later
  return tx.Save(coin.Db)
}

module.exports = { Hash, Block, Tx }
