const express = require('express')
// const controller = require('./controller.js')

class Routes {
  constructor(coin) {
    this.router = express.Router()

    this.router.get('/', (req, res) => {
      res.status(200).send('BlockJS API')
    })
    this.router.post('/', (req, res) => {
      res.status(200).json(req.body)
    })

    this.router.get('/Balance', (req, res) => {
      res.status(200).json({ balance: coin.Balance })
    })
    this.router.get('/Height', (req, res) => {
      coin.GetHeight()
        .then((height) => {
          res.status(200).json({ height })
        })
        .catch(error => res.status(400).json({ error }))
    })
    this.router.get('/Info', (req, res) => {
      const walletInfo = coin.WalletInfo
      coin.GetInfo()
        .then((info) => {
          const showInfo = `${info}
          Wallet address: ${walletInfo.Address} 
          Wallet name: '${walletInfo.Name}'
          Wallet balance: ${walletInfo.Balance}`
          res.status(200).send(showInfo)
        })
        .catch(error => res.status(400).json({ error }))
    })
    this.router.get('/Diff', (req, res) => {
      coin.GetDiff()
        .then((diff) => {
          res.status(200).send({ diff })
        })
        .catch(error => res.status(400).json({ error }))
    })
    this.router.get('/LastHash', (req, res) => {
      coin.GetBestHash()
        .then((hash) => {
          res.status(200).send({ hash })
        })
        .catch(error => res.status(400).json({ error }))
    })
    this.router.get('/AmountOfPendingTX', (req, res) => {
      coin.GetAmountOfPendingTX()
        .then((pending) => {
          res.status(200).send({ pending })
        })
        .catch(error => res.status(400).json({ error }))
    })
    this.router.get('/LastBlock', (req, res) => {
      coin.GetLastBlock()
        .then((block) => {
          res.status(200).send({ block })
        })
        .catch(error => res.status(400).json({ error }))
    })
    this.router.get('/BlockAtHeight/:height', (req, res) => {
      const height = Number(req.params.height)
      if (height) {
        coin.GetBlockAtHeight(height)
          .then((block) => {
            res.status(200).send({ block })
          })
          .catch(error => res.status(400).json({ error }))
      } else {
        res.status(400).send({ error: 'Height is not a number' })
      }
    })
    this.router.get('/GetBlockWithHash/:hash', (req, res) => {
      const { hash } = req.params
      if (hash && typeof (hash) === 'string') {
        coin.GetBlockWithHash(hash)
          .then((block) => {
            res.status(200).send({ block })
          })
          .catch(error => res.status(400).json({ error }))
      } else {
        res.status(400).send({ error: 'Hash is not a string' })
      }
    })
    this.router.get('/Wallet', (req, res) => {
      res.status(200).json({ balance: coin.WalletInfo })
    })
    this.router.get('/Mine', (req, res) => {
      coin.MineBlock()
        .then((block) => {
          res.status(200).send({ block })
        })
        .catch(error => res.status(400).json({ error }))
    })
    this.router.post('/RenameWallet/', (req, res) => {
      const { newName } = req.body
      coin.RenameWallet(newName)
        .then((result) => {
          res.status(200).send({ result })
        })
        .catch(error => res.status(400).json({ error }))
    })
    this.router.post('/SendTX/', (req, res) => {
      const { toAddress, amount } = req.body
      let tx
      coin.CreateTX(toAddress, amount)
        .then((newTx) => {
          tx = newTx
          return coin.SendTX(tx)
        })
        .then((resultSend) => {
          if (resultSend.n === 1 && resultSend.ok === 1) {
            res.status(200).json({ tx })
          } else {
            res.status(400).json({ error: 'Could not set TX' })
          }
        })
        .catch(error => res.status(400).json({ error }))
    })
  }
}

module.exports = Routes
