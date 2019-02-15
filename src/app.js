const Debug = require('debug')('blockjs:app')

const { Cst, CstTxt } = require('./blockchain/const.js')
const BlockChain = require('./blockchain/BlockChain.js')

const DbServer = process.env.dbServer
const ServerPort = parseInt(process.env.Port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbPort, 10) || Cst.DbPort
const APIPort = parseInt(process.env.apiPort, 10) || Cst.API.DefaultPort

BlockChain.Start(ServerPort, DbServer, DbPort, APIPort)
  .then((blockchain) => { Debug(`${CstTxt.BlockchainVersion} ${blockchain.Version} ${CstTxt.Started} !`) })
  .catch(err => console.error(err))
