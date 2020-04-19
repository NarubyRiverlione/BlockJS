const Debug = require('debug')('blockjs:genesis')

const { CreateGenesisMsg, CreateMessage, IsMessageValid } = require('./message.js')
const { ParseBlockFromDb, CreateBlock } = require('./block.js')
const { Pow } = require('./mining')

const { Cst, CstError, CstTxt } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

const MineNewGenesisBlock = async (SignedGenesisMsg) => {
  // callback to stop mining after the genesis block is found
  const onlyMineTheGenesisBlock = (stopNow) => (!stopNow)

  const GenesisBlock = await Pow(null, 0, 0, Cst.GenesisDiff,
    [SignedGenesisMsg], Cst.GenesisTimestamp, onlyMineTheGenesisBlock)

  onlyMineTheGenesisBlock(true)
  Debug(`-- Genesis block mined with hash ${GenesisBlock.Hash}`)
  Debug(`-- Genesis block mined with nonce ${GenesisBlock.Nonce}`)
  return GenesisBlock
}

const CreateGenesisBlock = async (db) => {
  try {
    if (!Cst.GenesisNonce) {
      // Genesis Nonce is not know, mine a new genesis block now
      const SignedGenesisMsg = await CreateMessage(Cst.GenesisAddress, Cst.GenesisMsg, db)
      Debug(`-- Genesis message signature ${SignedGenesisMsg.Signature}`)
      Debug(`-- Genesis message public key ${SignedGenesisMsg.PublicKey.toString('hex')}`)
      return await MineNewGenesisBlock(SignedGenesisMsg)
    }

    // Genesis Nonce is know, recreated previous mined genesis block
    const GenesisMsg = await CreateGenesisMsg()
    const GenesisBlock = CreateBlock(null, 0, Cst.GenesisNonce, Cst.GenesisDiff,
      [GenesisMsg], Cst.GenesisTimestamp, 1)


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
      Debug('Saved Genesis Hash <- -> has in database')
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
