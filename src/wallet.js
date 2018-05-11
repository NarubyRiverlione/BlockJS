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

const FindRelativeTX = ((links, wallet) => {
  const { RelativeBlockHeights, Address } = wallet
  const myTX = [] // tx in blockchain that contains this wallet address

  // default scan complet blockchain
  let needsScanning = links
  if (RelativeBlockHeights.length > 0) {
    // only sync missing part of blockchain
    const syncToHeight = MaxRelativeHeight()
    needsScanning = links.filter(link => link.Height > syncToHeight)
  }

  // find relative transactions for this wallet
  needsScanning.forEach((link) => {
    const { Height, Block } = link
    myTX.push(...RelativeTransactionInBlock(Block, Address))
    RelativeBlockHeights.push(Height)
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
  GetBalance(links) {
    let balance = 0
    const myTX = FindRelativeTX(links, this)

    myTX.forEach((tx) => {
      balance += this.DeltaBalanceFromTX(tx)
    })
    return balance
  }
}
module.exports = Wallet
