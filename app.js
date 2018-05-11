
const Debug = require('debug')('blockjs:app')

const Blockchain = require('./src/blockchain.js')
const TX = require('./src/transaction.js')

const SpiceCoin = new Blockchain()

Debug(`Blockchain is valid: ${SpiceCoin.IsValid()}`)
Debug(`Genesis Height : ${SpiceCoin.Height}`)
Debug(`Genesis Hash : ${SpiceCoin.GetHash()}`)
Debug(`Genesis Diff : ${SpiceCoin.Diff}`)

const GenesisBlock = SpiceCoin.GetBlock()
Debug(`Genesis block: ${JSON.stringify(GenesisBlock)}`)


const Me = Blockchain.CreateWallet('Me')
const You = Blockchain.CreateWallet('You')
const Dude = Blockchain.CreateWallet('Dude')

const tx1 = new TX(Me, You, 22)
const tx2 = new TX(You, Dude, 42)

SpiceCoin.SendTX(tx1)
SpiceCoin.SendTX(tx2)

SpiceCoin.MineBlock()

Debug(`Valid ? ${SpiceCoin.IsValid()}`)
// Debug(SpiceCoin.toString())
const tx3 = new TX(Dude, Me, 30)
SpiceCoin.SendTX(tx3)
SpiceCoin.MineBlock()

Debug(`Me balance: ${SpiceCoin.GetBalance(Me)}`)
Debug(`You balance: ${SpiceCoin.GetBalance(You)}`)
Debug(`Dude balance: ${SpiceCoin.GetBalance(Dude)}`)
