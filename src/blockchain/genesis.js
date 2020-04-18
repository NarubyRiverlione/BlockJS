const Debug = require('debug')('blockjs:genesis')

const { CreateMessage, IsMessageValid } = require('./message.js')
const { ParseBlockFromDb } = require('./block.js')
const { Pow } = require('./mining')

const { Cst, CstError, CstTxt } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst


const CreateGenesisBlock = async (db) => {
  try {
    const SignedGenesisMsg = await CreateMessage(Cst.GenesisAddress, Cst.GenesisMsg, db)
    Debug(`-- Genesis message signature ${SignedGenesisMsg.Signature}`)

    // const GenesisBlock = await CreateBlock(null, 0,
    //   Cst.GenesisNonce, Cst.GenesisDiff, [SignedGenesisMsg],
    //   Cst.GenesisTimestamp)

    // stop mining after the genesis block is found
    const onlyMineTheGenesisBlock = (stopNow) => (!stopNow)

    const GenesisBlock = await Pow(null, 0, 0, Cst.GenesisDiff, [SignedGenesisMsg], Cst.GenesisTimestamp, onlyMineTheGenesisBlock)
    onlyMineTheGenesisBlock(true)
    Debug(`-- Genesis block created with hash ${GenesisBlock.Hash}`)
    return GenesisBlock
  } catch (err) {
    /* istanbul ignore next */
    Debug(err.message); return null
  }
}


const CreateBlockchain = async (BlockChain) => {
  try {
    Debug('- Create blockchain by adding genesis block')
    const GenesisBlock = await CreateGenesisBlock(BlockChain.Db)
    Debug('-- Save genesis block in Db')
    return await GenesisBlock.Save(BlockChain.Db)
  } catch (err) {
    return Promise.reject(new Error(`${CstError.GenessisNotAdded} : ${err}`))
  }
}

const ExistInDb = async (BlockChain) => {
  try {
    const FirstBlocks = await BlockChain.Db.Find(CstDocs.Blockchain, { Height: 0 })

    if (FirstBlocks.length > 1) {
      return Promise.reject(new Error(`${CstError.MultiBlocks}`))
    }
    // no blocks in database = no genesis block (first run?)
    if (FirstBlocks.length === 0) {
      Debug('- No blockchain found, start new one by creating the Genesis block now')
      await CreateBlockchain(BlockChain)
      return Promise.resolve()
    }

    // check if first block is genesis block: verify hash === genesis hash
    const [FirstDbBlock] = FirstBlocks
    const FirstBlock = await ParseBlockFromDb(FirstDbBlock)
    if (!FirstBlock) return Promise.reject(new Error(CstError.ParseBlock))

    if (FirstBlock.Hash !== Cst.GenesisHashBlock) {
      return Promise.reject(new Error(CstError.GenessisNotFirst))
    }
    // verify first message is valid and signed with genesis signature
    const [GenesisMsg] = FirstBlock.Messages
    await IsMessageValid(GenesisMsg)
    if (GenesisMsg.Signature !== Cst.GenesisSignature) {
      Debug(`Saved genesis msg signature $(Cst.GenesisSignature} <- ->  actual signature ${GenesisMsg.Signature})`)
      return Promise.reject(new Error(CstError.GenessisNotFirst))
    }

    Debug(CstTxt.GenesisVerified)
    return Promise.resolve()
  } catch (err) {
    Debug(err.message)
    return Promise.reject(new Error(`${CstError.GenessisNotAdded}`))
  }
}


module.exports = { ExistInDb }
