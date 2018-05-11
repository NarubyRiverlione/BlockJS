
const Debug = require('debug')('blockjs:app')

const Blockchain = require('./src/blockchain.js')
const TX = require('./src/transaction.js')

const SpiceCoin = new Blockchain()

Debug(`Blockchain is valid: ${SpiceCoin.IsValid()}`)
Debug(`Height : ${SpiceCoin.Height}`)
Debug(`Hash : ${SpiceCoin.GetHash()}`)
Debug(`Diff : ${SpiceCoin.Diff}`)

const GenesisBlock = SpiceCoin.GetBlock()
Debug(`Genesis block: ${JSON.stringify(GenesisBlock)}`)
Debug(GenesisBlock.Transactions)

const tx1 = new TX('Me', 'You', 22)
const tx2 = new TX('You', 'Dude', 42)

SpiceCoin.SendTX(tx1)
SpiceCoin.SendTX(tx2)

SpiceCoin.MineBlock()

Debug(`Valid ? ${SpiceCoin.IsValid()}`)
Debug(SpiceCoin.toString())

