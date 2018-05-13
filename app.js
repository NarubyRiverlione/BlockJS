
const Debug = require('debug')('blockjs:app')
const Cst = require('./src/const.js')
const Coin = require('./src/coin.js')

const Wallet = require('./src/wallet.js')

let SpiceCoin
// const Me = Coin.CreateWallet('Me')

// dummy wallets for testing
const You = new Wallet('You')
const Dude = new Wallet('Dude')

Coin.Start()
  .then((coin) => {
    // Debug(`Blockchain is valid: ${Spic(eCoin.IsValid()}`)
    // Debug(`Genesis Height : ${SpiceCoin.GetHeight()}`)
    // Debug(`Genesis Hash : ${SpiceCoin.GetHash()}`)
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
    return SpiceCoin.GetBlockAtHeight(0)
  })
  .then((block0) => {
    Debug(`Block 0 is also Genesis block: ${JSON.stringify(block0)}`)
    return SpiceCoin.GetBlockWithHash(Cst.GenesisHash)
  })
  .then((foundBlock) => {
    Debug(` block: ${JSON.stringify(foundBlock)}`)
    //   Debug('Renaming wallet')
    //   return SpiceCoin.RenameWallet('Changed name')
    // })
    // .then(() => {
    //   Debug('Create and send TX 1:  -> you 22')
    //   const tx1 = SpiceCoin.CreateTX(You, 22)
    //   return SpiceCoin.SendTX(tx1)
    // })
    // .then(() => {
    //   Debug('Create and send TX 2: -> Dude 42')
    //   const tx2 = SpiceCoin.CreateTX(Dude, 42)
    //   return SpiceCoin.SendTX(tx2)
    // })
    // .then(() => {
    //   Debug('Mine block with all pending transactions')
    //   return SpiceCoin.MineBlock()
    // })
    // .then((resultMining) => {
    //   const block = JSON.stringify(resultMining)
    //   Debug(`New block : ${block}`)

    return SpiceCoin.Sync()
  })
  .then((balance) => {
    Debug(`My balance is ${balance}`)
  })

  .catch(err => console.error(err))
  // close Db connection
  .then(() => {
    SpiceCoin.End()
  })
