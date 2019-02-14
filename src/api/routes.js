const express = require('express')
// const controller = require('./controller.js')

class Routes {
  constructor(blockchain) {
    this.router = express.Router()

    this.router.get('/', (req, res) => {
      res.status(200).send('BlockJS API')
    })
    this.router.post('/', (req, res) => {
      res.status(200).json(req.body)
    })

    this.router.get('/Height', (req, res) => {
      blockchain.GetHeight()
        .then((height) => {
          res.status(200).json({ height })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/Address', (req, res) => {
      res.status(200).json({ address: blockchain.Address })
    })
    this.router.get('/Info', (req, res) => {
      let blockchainInfo

      blockchain.GetInfo()
        .then((info) => {
          blockchainInfo = info
          return blockchain.ConnectionCount()
        })
        .then((peerAmount) => {
          const showInfo = `
          BLOCKCHAIN INFO
          ${blockchainInfo}

          PEER INFO
          Connected peers: ${peerAmount.peers}`

          res.status(200).send(showInfo)
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/Diff', (req, res) => {
      blockchain.GetDiff()
        .then((diff) => {
          res.status(200).send({ diff })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/LastHash', (req, res) => {
      blockchain.GetBestHash()
        .then((hash) => {
          res.status(200).send({ hash })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/AmountOfPendingMsgs', (req, res) => {
      blockchain.GetAmountOfPendingMsgs()
        .then((amount) => {
          res.status(200).send({ GetAmountOfPendingMsgs: amount })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/AllPendingMgs', (req, res) => {
      blockchain.GetAllPendingMgs()
        .then((pending) => {
          res.status(200).send({ pending })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/LastBlock', (req, res) => {
      blockchain.GetLastBlock()
        .then((block) => {
          res.status(200).send({ block })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/BlockAtHeight/:height', (req, res) => {
      const height = Number(req.params.height)
      if (height) {
        blockchain.GetBlockAtHeight(height)
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
        blockchain.GetBlockWithHash(hash)
          .then((block) => {
            res.status(200).send({ block })
          })
          .catch(error => res.status(400).json({ error: error.message }))
      } else {
        res.status(400).send({ error: 'Hash is not a string' })
      }
    })
    this.router.get('/Mine', (req, res) => {
      blockchain.MineBlock()
        .then((block) => {
          res.status(200).send({ block })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    this.router.get('/AmountPeers', (req, res) => {
      const amount = blockchain.ConnectionCount()
      res.status(200).json(amount)
    })
    this.router.get('/PeersDetails', (req, res) => {
      const amount = blockchain.PeersDetail()
      res.status(200).json(amount)
    })
    // body: content
    this.router.post('/SendMsg/', (req, res) => {
      const { Content } = req.body
      const msg = blockchain.CreateMsg(Content)
      blockchain.SendMsg(msg)
        .then((result) => {
          if (result) {
            res.status(200).json({ msg })
          } else { res.status(400).send('error') }
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    // body: content
    this.router.post('/CheckMsgExist/', (req, res) => {
      const { Content, From } = req.body
      blockchain.FindMsg(Content, From)
        .then((result) => {
          res.status(200).json({ result })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
    // body: remoteIP, remotePort
    this.router.post('/ConnectPeer', (req, res) => {
      const { remoteIP, remotePort } = req.body
      blockchain.ConnectPeer(remoteIP, remotePort)
        .then((connectionResult) => {
          res.status(200).json({ connectionResult })
        })
        .catch(error => res.status(400).json({ error: error.message }))
    })
  }
}

module.exports = Routes
