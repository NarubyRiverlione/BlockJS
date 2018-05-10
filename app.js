
const Blockchain = require('./src/blockchain.js')
//const Block = require('./src/block.js')
const TX = require('./src/transaction.js')

const genesisRewardAddress = "Me!!"

const SpiceCoin = new Blockchain(genesisRewardAddress)

console.log(`Height : ${SpiceCoin.GetHeight()}`)
console.log(SpiceCoin.IsValid())
const GenesisBlock = SpiceCoin.GetBlock()

console.log(`Genesis block: ${JSON.stringify(GenesisBlock)}`)
console.log(GenesisBlock.Transactions)


const tx1 = new TX('Me', 'You', 22)
const tx2 = new TX('You', 'Dude', 42)

SpiceCoin.SendTX(tx1)
SpiceCoin.SendTX(tx2)

SpiceCoin.MineBlock()

console.log(`Valid ? ${SpiceCoin.IsValid()}`)
console.log(SpiceCoin.toString())

