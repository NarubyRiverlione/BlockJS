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

    this.router.get('/getBlock', (req, res) => {
      coin.GetLastBlock()
        .then((lastBlock) => {
          res.status(200).json(lastBlock)
        })
        .catch(err => console.error(err))
    })
  }
}

module.exports = Routes
