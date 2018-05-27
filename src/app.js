
const Debug = require('debug')('blockjs:app')
const Cst = require('./blockchain/const.js')
const Coin = require('./blockchain/coin.js')
const Wallet = require('./blockchain/wallet.js')

const ServerPort = parseInt(process.env.port, 10) || Cst.DefaultPort
const DbPort = parseInt(process.env.dbport, 10) || Cst.DbPort

let SpiceCoin
Coin.Start(ServerPort, DbPort)
  .then((coin) => {
    SpiceCoin = coin
    Debug('Coin started !')
    // const App = API(CstAPI.Root, apiRoutes)
    // const server = http.createServer(App)
    // setImmediate(() => {
    //   server.listen(CstAPI.DefaultPort, CstAPI.IP, () => {
    //     Debug(`Express server listening on http://${CstAPI.IP}:${CstAPI.DefaultPort}`)
    //   })
    // })

    // const secureServer = https.createServer(SSL_OPTIONS, App)
    // secureServer.listen(CstAPI.DefaultPort, CstAPI.IP, () => {
    //   Debug(`Express server listening on https:/${CstAPI.IP}:${CstAPI.DefaultPort}`)
    // })
  })
  .catch(err => console.error(err))

