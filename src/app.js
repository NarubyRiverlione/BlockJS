
const Debug = require('debug')('blockjs:app')
const Cst = require('./blockchain/const.js')
const Coin = require('./blockchain/coin.js')
const Wallet = require('./blockchain/wallet.js')

const DbServer = process.env.dbServer
const ServerPort = parseInt(process.env.Port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbPort, 10) || Cst.DbPort
const APIPort = parseInt(process.env.apiPort, 10) || Cst.API.DefaultPort

let SpiceCoin
Coin.Start(ServerPort, DbServer, DbPort, APIPort)
  .then((coin) => {
    SpiceCoin = coin
    Debug('Coin started !')
  })
  .catch(err => console.error(err))

