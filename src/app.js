
const Debug = require('debug')('blockjs:app')
const Cst = require('./blockchain/const.js')
const BlockChain = require('./blockchain/BlockChain.js')
// const Wallet = require('./blockchain/wallet.js')

const DbServer = process.env.dbServer
const ServerPort = parseInt(process.env.Port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbPort, 10) || Cst.DbPort
const APIPort = parseInt(process.env.apiPort, 10) || Cst.API.DefaultPort

// let SpiceCoin
BlockChain.Start(ServerPort, DbServer, DbPort, APIPort)
  .then((blockchain) => {
    // SpiceCoin = BlockChain
    Debug(`Blockchain version ${blockchain.Version} started !`)
  })
  .catch(err => console.error(err))

