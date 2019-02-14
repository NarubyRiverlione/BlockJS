const express = require('express')
const forceSSL = require('express-force-ssl')
// const cors = require( 'cors'
const compression = require('compression')
const morgan = require('morgan')
const bodyParser = require('body-parser')

const queryErrorHandler = require('querymen').errorHandler
const bodyErrorHandler = require('bodymen').errorHandler

const Routes = require('./routes.js')
const { Cst } = require('../blockchain/const.js')

module.exports = (BlockChain) => {
  const app = express()
  const apiRoutes = new Routes(BlockChain)

  // https
  app.set('forceSSLOptions', {
    enable301Redirects: false,
    trustXFPHeader: true,
  })
  app.use(forceSSL)
  // compression
  app.use(compression())
  // logger
  app.use(morgan('dev'))
  // body must be json
  app.use(Cst.API.Root, (req, res, next) => {
    if (req.body) {
      const contentType = req.headers['content-type']
      if (!contentType || contentType.indexOf('application/json') !== 0) {
        return res.status(400).json({ error: `Body must be Json, not ${contentType}` })
      }
    }
    next()
  })
  // parse body as json
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())
  // routes
  app.use(Cst.API.Root, apiRoutes.router)
  // error handlers
  app.use(queryErrorHandler())
  app.use(bodyErrorHandler())

  return app
}

