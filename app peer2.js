
const Debug = require('debug')('blockjs:app')
const Cst = require('./src/const.js')
const Coin = require('./src/coin.js')


const ServerPort = parseInt(process.env.port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbport, 10) || Cst.DbPort

let SpiceCoin

Coin.Start(ServerPort, DbPort)
  .then((coin) => {
    // Debug(`Blockchain is valid: ${Spic(eCoin.IsValid()}`)
    // Debug(`Genesis Height : ${SpiceCoin.GetHeight()}`)
    // Debug(`Genesis Hash : ${SpiceCoin.GetBestHash()}`)
    // Debug(`Genesis Diff : ${SpiceCoin.GetDiff()}`)
    SpiceCoin = coin
    return SpiceCoin.GetInfo()
  })
  .then((info) => {
    Debug(info)
    return SpiceCoin.GetLastBlock()
  })
  .then((LastBlock) => {
    Debug(`Last block: ${JSON.stringify(LastBlock)}`)

    return SpiceCoin.SyncWallet()
  })
  .then(() => {
    Debug(`My balance is ${SpiceCoin.Balance}`)

    SpiceCoin.ConnectPeer('192.168.1.200') // peer 1 on localhost, default ports
  })

  .catch(err => console.error(err))
  // // close Db connection
  // .then(() => {
  //   if (SpiceCoin) { SpiceCoin.End() }
  //   return null
  // })
