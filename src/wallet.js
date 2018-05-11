const crypto = require('crypto')
const PrivateKeySize = require('./const').PrivateKeySize // eslint-disable-line

const RelativeTransactionInBlock = ((block, address) => {
  const ownTX = []
  block.Transactions.forEach((tx) => {
    if (tx.FromAddress === address || tx.ToAddress === address) { ownTX.push(tx) }
  })
  return ownTX
})

const MaxRelativeHeight = RelativeBlockHeights => Math.max(...RelativeBlockHeights)

const FindRelativeTX = ((chainblocks, wallet) => {
  const { RelativeBlockHeights, Address } = wallet
  const myTX = [] // tx in blockchain that contains this wallet address

  // default scan complet blockchain
  let needsScanning = chainblocks
  if (RelativeBlockHeights.length > 0) {
    // only sync missing part of blockchain
    const syncToHeight = MaxRelativeHeight()
    needsScanning = chainblocks.filter(chainblock => chainblock.height > syncToHeight)
  }

  // find relative transactions for this wallet
  needsScanning.forEach((chainblock) => {
    const { height, block } = chainblock
    myTX.push(...RelativeTransactionInBlock(block, Address))
    RelativeBlockHeights.push(height)
  })

  return myTX
})


class Wallet {
  constructor(name, address) {
    this.Name = name
    this.Address = address || crypto.randomBytes(PrivateKeySize).toString('hex')
    this.RelativeBlockHeights = []
  }

  static CheckIsWallet(check) {
    return check instanceof Wallet
  }

  DeltaBalanceFromTX(tx) {
    if (tx.FromAddress === this.Address) return -tx.Amount
    else if (tx.ToAddress === this.Address) return tx.Amount
    return 0
  }

  // scan blockchain to calculate balance for this walllet
  GetBalance(chainblocks) {
    let balance = 0
    const myTX = FindRelativeTX(chainblocks, this)

    myTX.forEach((tx) => {
      balance += this.DeltaBalanceFromTX(tx)
    })
    return balance
  }
}
module.exports = Wallet
