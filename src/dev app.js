
const Debug = require('debug')('blockjs:app')
const Cst = require('./blockchain/const.js')
const Coin = require('./blockchain/coin.js')

const Wallet = require('./blockchain/wallet.js')

const ServerPort = parseInt(process.env.Port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbPort, 10) || Cst.DbPort
const APIPort = parseInt(process.env.apiPort, 10) || Cst.API.DefaultPort

let SpiceCoin
// const Me = Coin.CreateWallet('Me')

// dummy wallets for testing
const DockerAddress = 'SPICE_602d0abb8df465117a22'


Coin.Start(ServerPort, '127.0.0.1', DbPort, APIPort)
  .then((coin) => {
    SpiceCoin = coin
    return SpiceCoin.GetInfo()
  })
  .then((info) => {
    Debug(info)
    //   return SpiceCoin.GetHeight()
    // })
    // .then((height) => {
    //   Debug(`Blockchain loaded with height ${height}`)
    // Debug(`Genesis block: ${JSON.stringify(GenesisBlock)}`)

    // Debug('Renaming wallet')
    // return SpiceCoin.RenameWallet('Genesis Wallet')
    // })
    // .then(() => {
    //   Debug('Create TX 1:  -> docker 22')
    //   return SpiceCoin.CreateTX(DockerAddress, 20)
    // })
    // .then((tx1) => {
    //   Debug('Send tx1')
    //   return SpiceCoin.SendTX(tx1)
    // })

    // .then(() => {
    //   Debug('Create  TX 2: -> Dude 42')
    //   return SpiceCoin.CreateTX(DockerAddress, 30)
    // })
    // .then((tx2) => {
    //   Debug('Sent tx2')
    //   return SpiceCoin.SendTX(tx2)
    // })

    // .then(() => {
    //   Debug('Mine block with all pending transactions')
    //   return SpiceCoin.MineBlock()
    // })
    // .then((resultMining) => {
    //   const block = JSON.stringify(resultMining)
    //   Debug(`New block : ${block}`)

    //   return SpiceCoin.SyncWallet()
    // })
    // .then(() => SpiceCoin.GetBalance())
    // .then((balance) => {
    //   Debug(`My balance is ${balance}`)
    // SpiceCoin.ConnectPeer('127.0.0.1')
  })

  .catch(err => console.error(err))

