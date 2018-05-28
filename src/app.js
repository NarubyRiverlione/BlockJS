
const Debug = require('debug')('blockjs:app')
const Cst = require('./blockchain/const.js')
const Coin = require('./blockchain/coin.js')
const Wallet = require('./blockchain/wallet.js')

const ServerPort = parseInt(process.env.port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbport, 10) || Cst.DbPort

let SpiceCoin
Coin.Start(ServerPort, DbPort)
  .then((coin) => {
    SpiceCoin = coin
    Debug('Coin started !')
  })
  .catch(err => console.error(err))

