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
      coin.GetBalance()
        .then((balance) => {
          res.status(200).json({ balance })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/Height', (req, res) => {
      coin.GetHeight()
        .then((height) => {
          res.status(200).json({ height })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/Info', (req, res) => {
      let walletInfo
      coin.GetWalletInfo()
        .then((wallet) => {
          walletInfo = wallet
          return coin.GetInfo()
        })
        .then((info) => {
          const showInfo = `${info}
          Wallet address: ${walletInfo.Address} 
          Wallet name: '${walletInfo.Name}'
          Wallet balance: ${walletInfo.Balance}`
          res.status(200).send(showInfo)
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/Diff', (req, res) => {
      coin.GetDiff()
        .then((diff) => {
          res.status(200).send({ diff })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/LastHash', (req, res) => {
      coin.GetBestHash()
        .then((hash) => {
          res.status(200).send({ hash })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/AmountOfPendingTX', (req, res) => {
      coin.GetAmountOfPendingTX()
        .then((pending) => {
          res.status(200).send({ pending })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/LastBlock', (req, res) => {
      coin.GetLastBlock()
        .then((block) => {
          res.status(200).send({ block })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/BlockAtHeight/:height', (req, res) => {
      const height = Number(req.params.height)
      if (height) {
        coin.GetBlockAtHeight(height)
          .then((block) => {
            res.status(200).send({ block })
          })
          .catch(error => res.status(400).json({ error: error.message }))
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
          .catch(error => res.status(400).json({ error: error.message }))
      } else {
        res.status(400).send({ error: 'Hash is not a string' })
      }
    })
    this.router.get('/Wallet', (req, res) => {
      coin.GetWalletInfo()
        .then((wallet) => {
          res.status(200).json({ wallet })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/Mine', (req, res) => {
      coin.MineBlock()
        .then((block) => {
          res.status(200).send({ block })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/SyncWallet', (req, res) => {
      coin.SyncWallet()
        .then((balance) => {
          res.status(200).send({ balance })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    // body: newName
    this.router.post('/RenameWallet/', (req, res) => {
      const { newName } = req.body
      coin.RenameWallet(newName)
        .then((wallet) => {
          res.status(200).send({ wallet })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    // body:  toAddress, amount
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
            res.status(400).json({ error: `Could not send TX: ${resultSend}` })
          }
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    // body: remoteIP, remotePort
    this.router.post('/ConnectPeer', (req, res) => {
      const { remoteIP, remotePort } = req.body
      const result = this.coin.ConnectPeer(remoteIP, remotePort)
      res.status(200).send(result)
    })
  }
}

module.exports = Routes
