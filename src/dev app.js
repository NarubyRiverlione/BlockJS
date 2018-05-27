
const Debug = require('debug')('blockjs:app')
const Cst = require('./blockchain/const.js')
const Coin = require('./blockchain/coin.js')

const Wallet = require('./blockchain/wallet.js')

const ServerPort = parseInt(process.env.port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbport, 10) || Cst.DbPort

let SpiceCoin
// const Me = Coin.CreateWallet('Me')

// dummy wallets for testing
const You = new Wallet('You')
const Dude = new Wallet('Dude')

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
  .then((GenesisBlock) => {
    Debug(`Genesis block: ${JSON.stringify(GenesisBlock)}`)

    // Debug('Renaming wallet')
    // return SpiceCoin.RenameWallet('Genesis Wallet')
    // })
    // .then(() => {
    //   Debug('Create TX 1:  -> you 22')
    //   return SpiceCoin.CreateTX(You, 20)
    // })
    // .then((tx1) => {
    //   Debug('Send tx1')
    //   return SpiceCoin.SendTX(tx1)
    // })

    // .then(() => {
    //   Debug('Create  TX 2: -> Dude 42')
    //   return SpiceCoin.CreateTX(Dude, 30)
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
    // .then(() => {
    Debug(`My balance is ${SpiceCoin.Balance}`)
    SpiceCoin.ConnectPeer('192.168.1.142')
  })

  .catch(err => console.error(err))
  // // close Db connection
  // .then(() => {
  //   if (SpiceCoin) { SpiceCoin.End() }
  //   return null
  // })
