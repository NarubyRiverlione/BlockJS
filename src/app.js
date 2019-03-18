process.env.UV_THREADPOOL_SIZE = 64 // 128

const Debug = require('debug')('blockjs:app')
const Sentry = require('@sentry/node')
const { Cst, CstTxt } = require('./Const.js')
const BlockChain = require('./blockchain/BlockChain.js')

Sentry.init({ dsn: 'https://93b377777ac64d6c82956ef60947354c@sentry.io/1396748' })

const DbServer = process.env.dbServer
const ServerPort = parseInt(process.env.Port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbPort, 10) || Cst.DbPort
const APIPort = parseInt(process.env.apiPort, 10) || Cst.API.DefaultPort


BlockChain.Start(ServerPort, DbServer, DbPort, APIPort)
  .then((blockchain) => { Debug(`${CstTxt.BlockchainVersion} ${blockchain.Version} ${CstTxt.Started} !`) })
  .catch(err => console.error(err))
