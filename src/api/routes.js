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

    this.router.get('/Height', (req, res) => {
      coin.GetHeight()
        .then((height) => {
          res.status(200).json({ height })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/Info', (req, res) => {
      let walletInfo
      let blockchainInfo

      coin.GetWalletInfo()
        .then((wallet) => {
          walletInfo = wallet
          return coin.GetInfo()
        })
        .then((info) => {
          blockchainInfo = info
          return coin.ConnectedAmount()
        })
        .then((peerAmount) => {
          const showInfo = `
          BLOCKCHAIN INFO
          ${blockchainInfo}

          WALLET INFO
          Wallet address: ${walletInfo.Address} 
          Wallet name: '${walletInfo.Name}'
          Wallet balance: ${walletInfo.Balance}

          PEER INFO
          Connected peers: ${peerAmount.peers}`

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
    this.router.get('/AmountOfPendingMsgs', (req, res) => {
      coin.GetAmountOfPendingMsgs()
        .then((amount) => {
          res.status(200).send({ GetAmountOfPendingMsgs: amount })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/AllPendingMgs', (req, res) => {
      coin.GetAllPendingMgs()
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
    this.router.get('/Mine', (req, res) => {
      coin.MineBlock()
        .then((block) => {
          res.status(200).send({ block })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/AmountPeers', (req, res) => {
      const amount = coin.ConnectedAmount()
      res.status(200).json(amount)
    })
    this.router.get('/PeersDetails', (req, res) => {
      const amount = coin.PeersDetail()
      res.status(200).json(amount)
    })
    // body: content
    this.router.post('/SendMsg/', (req, res) => {
      const { Content } = req.body
      let msg
      coin.CreateMsg(Content)
        .then((newTx) => {
          msg = newTx
          return coin.SendMsg(msg)
        })
        .then((sendMsg) => {
          res.status(200).json({ sendMsg })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    // body: remoteIP, remotePort
    this.router.post('/ConnectPeer', (req, res) => {
      const { remoteIP, remotePort } = req.body
      coin.ConnectPeer(remoteIP, remotePort)
        .then((connectionResult) => {
          res.status(200).json({ connectionResult })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
  }
}

module.exports = Routes
