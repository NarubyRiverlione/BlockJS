
const Debug = require('debug')('blockjs:app')

const Coin = require('./src/coin.js')

const SpiceCoin = new Coin()

Debug(`Blockchain is valid: ${SpiceCoin.IsValid()}`)
Debug(`Genesis Height : ${SpiceCoin.Height}`)
Debug(`Genesis Hash : ${SpiceCoin.GetHash()}`)
Debug(`Genesis Diff : ${SpiceCoin.Diff}`)

const GenesisBlock = SpiceCoin.GetBlock()
Debug(`Genesis block: ${JSON.stringify(GenesisBlock)}`)


const Me = Coin.CreateWallet('Me')
const You = Coin.CreateWallet('You')
const Dude = Coin.CreateWallet('Dude')

const tx1 = Coin.CreateTX(Me, You, 22)
const tx2 = Coin.CreateTX(You, Dude, 42)

SpiceCoin.SendTX(tx1)
SpiceCoin.SendTX(tx2)

SpiceCoin.MineBlock()

Debug(`Valid ? ${SpiceCoin.IsValid()}`)
// Debug(SpiceCoin.toString())
const tx3 = Coin.CreateTX(Dude, Me, 30)
SpiceCoin.SendTX(tx3)
SpiceCoin.MineBlock()

Debug(`Me balance: ${SpiceCoin.GetBalance(Me)}`)
Debug(`You balance: ${SpiceCoin.GetBalance(You)}`)
Debug(`Dude balance: ${SpiceCoin.GetBalance(Dude)}`)
