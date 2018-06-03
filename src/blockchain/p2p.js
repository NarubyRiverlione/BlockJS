const WebSocket = require('ws')
const Debug = require('debug')('blockjs:p2p')
const Cst = require('./const.js')
const Block = require('./block.js')
const Incoming = require('./incoming.js')

/*
inbound HashMsg -> send InvMsg([received Hash ... best hash])
inbound InvMsg(neededHashes) ->  AskNeededBlocks:  send x GetBlockMsg(hash)
inbound GetBlockMsg(hash) -> SendBlockMsg(hash)
inbound BlockMsg(block) ->IncomingBlock(block):  add to local blockchain
*/

const AckMsg =
  JSON.stringify({ type: Cst.P2P.NACK, payload: null })
const NakMsg =
  JSON.stringify({ type: Cst.P2P.NACK, payload: null })

const ConnectedMsg =
  JSON.stringify({ type: Cst.P2P.CONNECTED, payload: null })

const VersionMsg = version =>
  JSON.stringify({ type: Cst.P2P.VERSION, payload: version })

const HashMsg = hash =>
  JSON.stringify({ type: Cst.P2P.HASH, payload: hash })

const InvMsg = availableHashes =>
  JSON.stringify({ type: Cst.P2P.INVENTORY, payload: availableHashes })

const GetBlockMsg = hash =>
  JSON.stringify({ type: Cst.P2P.GETBLOCK, payload: hash })

// FIXME sends a Block object, icl __proto__
const BlockMsg = block =>
  JSON.stringify({ type: Cst.P2P.BLOCK, payload: block })


const AskNeededBlocks = (neededHashes, peer) => {
  neededHashes.forEach((hash) => {
    peer.send(GetBlockMsg(hash))
  })
}

const BroadcastMsg = (type, payload) =>
  JSON.stringify({ type, payload })


class P2P {
  constructor(port, coin) {
    this.Server = new WebSocket.Server({
      port,
      clientTracking: true, // keep list of connected peers
    })

    this.Coin = coin
    this.OutgoingConnections = []

    // start listening
    this.Server.on('listening', () => { Debug(`Listening on port ${port}`) })
    // incoming connections -> setup message handle + send info of own peer
    this.SetupIncomingConnectionHandle()
    // handle a connection disconnect
    this.Server.on('close', () => { Debug('peer has disconnected') })
    // handle error
    this.Server.on('error', (error) => { Debug(`Error: ${error}`) })
  }

  Amount() {
    const incoming = this.Server.clients.size
    const out = this.OutgoingConnections.length
    return { peers: incoming + out }
  }
  IncomingDetails() {
    // TODO clients has no information
    return this.Server.clients
  }
  OutgoingDetails() {
    return this.OutgoingConnections.map(out => out.url)
  }

  // peer connects = send ACK + send Version msg and BestHash msg
  SetupIncomingConnectionHandle() {
    this.Server.on('connection', (peer, req) => {
      // setup message handle
      peer.on('message', (message) => { this.MessageHandle(message, peer) })

      const { remoteAddress, remotePort } = req.connection
      Debug(`Incoming connection from ${remoteAddress} on port ${remotePort}`)

      // send Connected Msg
      peer.send(ConnectedMsg)
      // send version of this peer
      peer.send(VersionMsg(this.Coin.Version))
      // send hash of this blockchain
      this.Coin.GetBestHash()
        .then((hash) => { peer.send(HashMsg(hash)) })
        .catch(err => console.error(err))
    })
  }

  // send message to all connected peers (incoming) and connections (outgoing)
  Broadcast(type, payload) {
    Debug(`Broadcast a ${type} message`)
    const msg = BroadcastMsg(type, payload)
    this.Server.clients.forEach((peer) => {
      peer.send(msg)
    })
    this.OutgoingConnections.forEach((connection) => {
      connection.send(msg)
    })
  }

  // evaluate message
  MessageHandle(message, peer) {
    const msg = JSON.parse(message)
    // Debug(`Received: "${msg.type} from peer `) // ${remoteIP}`)
    // Debug(JSON.stringify(msg.payload))

    switch (msg.type) {
      case Cst.P2P.RECEIVED:
      case Cst.P2P.ACK:
      case Cst.P2P.NACK:
      case Cst.P2P.CONNECTED:
        break// prevent endless loop

      case Cst.P2P.VERSION:
        Debug(`Connected to peer version ${msg.payload}`)
        break

      case Cst.P2P.BLOCK:
        Incoming.Block(msg.payload, this.Coin)
          .then((result) => {
            if (result instanceof Block) {
              Debug('Incoming block successful evaluated')
              // check if there's a relevant transaction for this wallet
              this.Wallet.IncomingBlock(result, this.Db)
            }
          })
          .catch(err => console.error(err))
        break

      case Cst.P2P.HASH:
        Debug(`Connected peer best hash ${msg.payload}`)
        Incoming.Hash(msg.payload, this.Coin)
          // send hashes that peers doesn't have
          .then((peerNeededHashes) => {
            Debug(`Send Inv with ${peerNeededHashes.length} hashes to peer`)
            peer.send(InvMsg(peerNeededHashes))
          })
          .catch(err => console.error(err))
        break

      case Cst.P2P.INVENTORY:
        // save needed hashes
        this.Coin.NeededHashes = this.Coin.NeededHashes.concat(msg.payload)
        // ask for blocks with  hashes that are available with this connected peer
        AskNeededBlocks(msg.payload, peer)
        break

      case Cst.P2P.GETBLOCK:
        Debug(`Peer asked for block with hash ${msg.payload}`)
        this.Coin.GetBlockWithHash(msg.payload)
          .then(block => peer.send(BlockMsg(block)))
          .catch(err => console.error(err))
        break
      case Cst.P2P.TRANSACTION:
        Debug('Incoming transaction')
        Incoming.Tx(msg.payload, this.Coin)
          .then(() => Debug('Incoming transaction saved'))
          .catch(err => console.error(err))
        break
      default: peer.send(NakMsg)
    }
  }

  // Connect to a peer, send version + best hash
  Connect(remoteIP, remotePort) {
    return new Promise((resolve, reject) => {
      if (!remotePort) {
        return reject(new Error('No remote IP'))
      }
      if (!remotePort) {
        return reject(new Error('No remote port'))
      }

      Debug(`Connecting to peer ${remoteIP} on port ${remotePort}`)
      const connection = new WebSocket(`ws://${remoteIP}:${remotePort}`)

      // handle a connection disconnect
      connection.on('close', () => {
        // remove outgoing connection from saved
        this.OutgoingConnections = this.OutgoingConnections.filter(conn => conn !== connection)
        Debug('connection has disconnected')
      })
      // handle error
      connection.on('error', error =>
        Debug(`P2P connection error to ${remoteIP}:${remotePort} \n ${error}`))

      // setup message handler from this connection
      connection.on('message', (message) => { this.MessageHandle(message, connection) })
      // send handshake with own version and best hash
      connection.on('open', () => {
        this.SendHandshake(connection, remoteIP, remotePort)
          .then(result => resolve(result))
          .catch(err => reject(err))
      })
    })
  }

  SendHandshake(connection, remoteIP, remotePort) {
    return new Promise((resolve, reject) => {
      Debug(`Connected to peer ${remoteIP}`)

      // save Outgoing connection to broadcast later
      this.OutgoingConnections.push(connection)
      Debug('Sending Version message')
      connection.send(VersionMsg(this.Coin.Version))

      // send hash of this blockchain
      this.Coin.GetBestHash()
        .then((hash) => {
          Debug('Sending best hash')
          connection.send(HashMsg(hash))
          return resolve(`P2P handshake done with ${remoteIP}:${remotePort}`)
        })
        .catch(err => reject(new Error(`ERROR sending best hash ${err}`)))
    })
  }

  Close() {
    this.Server.close()
  }
}

module.exports = P2P
