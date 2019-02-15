
const Debug = require('debug')('blockjs:app')
const { Cst } = require('./Const.js')
const BlockChain = require('./blockchain/BlockChain.js')

const ServerPort = parseInt(process.env.Port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbPort, 10) || Cst.DbPort
const APIPort = parseInt(process.env.apiPort, 10) || Cst.API.DefaultPort

let SpiceCoin
// const Me = BlockChain.CreateWallet('Me')


BlockChain.Start(ServerPort, '127.0.0.1', DbPort, APIPort)
  .then((blockchain) => {
    SpiceCoin = blockchain
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
    // .then((msg1) => {
    //   Debug('Send msg1')
    //   return SpiceCoin.SendTX(msg1)
    // })

    // .then(() => {
    //   Debug('Create  TX 2: -> Dude 42')
    //   return SpiceCoin.CreateTX(DockerAddress, 30)
    // })
    // .then((msg2) => {
    //   Debug('Sent msg2')
    //   return SpiceCoin.SendTX(msg2)
    // })

    // .then(() => {
    //   Debug('Mine block with all pending messages')
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

