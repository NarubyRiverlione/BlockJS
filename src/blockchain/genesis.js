const Debug = require('debug')('blockjs:genesis')

const { ReadKey, ExportPublicPEM } = require('./crypt')
const { CreateMessage } = require('./message.js')
const { CreateBlock, ParseBlockFromDb } = require('./block.js')
const { Cst, CstError } = require('../Const.js')

const { Db: { Docs: CstDocs } } = Cst

const CreateGenesisBlock = async () => {
  try {
    const GenesisMsg = await CreateMessage(Cst.GenesisAddress, Cst.GenesisMsg, Cst.GenesisMsgId)

    if (Cst.GenesisPubKey) {
      // Genesis Public key is already know
      GenesisMsg.PublicKey = Cst.GenesisPubKey
    } else {
      /* brand new blockchain, no public key for signing available:
        use public key form this node to bootstrap the blockchain      */
      const GenesisPubKey = await ReadKey(Cst.KeyDir.concat(Cst.PubFile))
      GenesisMsg.PublicKey = GenesisPubKey
      const GenPubPEM = ExportPublicPEM(GenesisPubKey)
      Debug(`-- Genesis public key: \n ${GenPubPEM}`)
    }


    if (Cst.GenesisSignature) {
      // Genesis signature is already know
      GenesisMsg.Signature = Cst.GenesisSignature
    } else {
      /* brand new blockchain, no private key for signing available:
        use private key form this node to bootstrap the blockchain      */
      const GenesisPrivKey = await ReadKey(Cst.KeyDir.concat(Cst.PrivFile))

      GenesisMsg.Sign(GenesisPrivKey, GenesisMsg.PublicKey)
      Debug(`-- Genesis signature: ${GenesisMsg.Signature}`)
    }

    const GenesisBlock = await CreateBlock(null, 0,
      Cst.GenesisNonce, Cst.GenesisDiff, [GenesisMsg],
      Cst.GenesisTimestamp)
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
    const GenesisBlock = await CreateGenesisBlock()
    Debug('-- Save genesis block in Db')
    return await GenesisBlock.Save(BlockChain.Db)
  } catch (err) {
    return Promise.reject(new Error(`${CstError.GenessisNotAdded} : ${err}`))
  }
}

const ExistInDb = (BlockChain) => (
  new Promise(async (resolve, reject) => {
    try {
      const FirstBlocks = await BlockChain.Db.Find(CstDocs.Blockchain, { Height: 0 })

      if (FirstBlocks.length > 1) {
        return reject(new Error(`${CstError.MultiBlocks}`))
      }
      // no blocks in database = no genesis block (first run?)
      if (FirstBlocks.length === 0) {
        Debug('- No blockchain found')
        const result = await CreateBlockchain(BlockChain)
        return resolve(result)
      }

      // check if first block is genesis block: verify hash === genesis hash
      const [FirstDbBlock] = FirstBlocks
      const FirstBlock = await ParseBlockFromDb(FirstDbBlock)
      if (!FirstBlock) return reject(new Error(CstError.ParseBlock))

      if (FirstBlock.Hash !== Cst.GenesisHashBlock) {
        return reject(new Error(CstError.GenessisNotFirst))
      }
      // verify first message is signed with genesis signature
      const [GenesisMsg] = FirstBlock.Messages
      const verified = GenesisMsg.Verify()
      if (!verified || GenesisMsg.Signature !== Cst.GenesisSignature) {
        return reject(new Error(CstError.GenessisNotFirst))
      }
      console.log(GenesisMsg.PublicKey.buffer)

      return resolve(true)
    } catch (err) {
      Debug(err.message)
      return reject(new Error(`${CstError.GenessisNotAdded}`))
    }
  })
)

module.exports = { ExistInDb }
