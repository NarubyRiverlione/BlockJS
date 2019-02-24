const WebSocket = require('ws')
const Debug = require('debug')('blockjs:p2p')
const Block = require('./Block.js')
const Incoming = require('./Incoming.js')

const { Cst, CstError } = require('../Const.js')

const { P2P: CstP2P } = Cst

/*
inbound HashMsg -> send InvMsg([received Hash ... best hash])
inbound InvMsg(neededHashes) ->  AskNeededBlocks:  send x GetBlockMsg(hash)
inbound GetBlockMsg(hash) -> SendBlockMsg(hash)
inbound BlockMsg(block) ->IncomingBlock(block):  add to local blockchain
*/

const CreateP2Pmsg = (type, payload) => JSON.stringify({ type, payload })

const AskNeededBlocks = (neededHashes, peer) => {
  neededHashes.forEach((hash) => {
    peer.send(CreateP2Pmsg(CstP2P.GETBLOCK, hash))
  })
}

class P2P {
  constructor(port, BlockChain) {
    this.Server = new WebSocket.Server({
      port,
      clientTracking: true, // keep list of connected peers
    })

    this.BlockChain = BlockChain
    this.OutgoingConnections = []
    this.IncomingConnections = []

    // start listening
    this.Server.on('listening', () => { Debug(`Listening on port ${port}`) })
    // incoming connections -> setup message handle + send info of own peer
    this.SetupIncomingConnectionHandle()
    // stop server, disconnect all peers
    this.Server.on('close', () => {
      Debug('Server stopped, all in/outgoing connections are closed')
      this.IncomingConnections = []
      this.OutgoingConnections = []
    })
    // handle error
    this.Server.on('error', (error) => { Debug(`Error: ${error}`) })
  }

  // amount of incoming (peers) and outgoing (connection)
  Amount() {
    const incoming = this.Server.clients.size
    const out = this.OutgoingConnections.length
    return { peers: incoming + out }
  }

  IncomingDetails() {
    return this.IncomingConnections.map(peer => peer.url)
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
      this.IncomingConnections.push({ url: `${remoteAddress}:${remotePort}` })
      // send Connected Msg
      peer.send(CreateP2Pmsg(CstP2P.CONNECTED, null))
      // send version of this peer
      peer.send(CreateP2Pmsg(CstP2P.VERSION, this.BlockChain.Version))
      // send hash of this blockchain
      this.BlockChain.GetBestHash()
        .then((hash) => { peer.send(CreateP2Pmsg(CstP2P.HASH, hash)) })
        .catch(err => console.error(err))
    })
  }

  // send message to all connected peers (incoming) and connections (outgoing)
  Broadcast(type, payload) {
    Debug(`Broadcast a ${type} message`)
    const msg = CreateP2Pmsg(type, payload)
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
      case CstP2P.RECEIVED:
      case CstP2P.ACK:
      case CstP2P.NACK:
      case CstP2P.CONNECTED:
        break// prevent endless loop

      case CstP2P.VERSION:
        Debug(`Connected to peer version ${msg.payload}`)
        break

      case CstP2P.BLOCK:
        Incoming.Block(msg.payload, this.BlockChain)
          .then((result) => {
            if (result instanceof Block) {
              Debug('Incoming block successful evaluated')
              // check if there's a relevant message for this wallet
              this.Wallet.IncomingBlock(result, this.Db)
            }
          })
          .catch(err => console.error(err))
        break

      case CstP2P.HASH:
        Debug(`Connected peer best hash ${msg.payload}`)
        Incoming.Hash(msg.payload, this.BlockChain)
          // send hashes that peers doesn't have
          .then((peerNeededHashes) => {
            Debug(`Send Inv with ${peerNeededHashes.length} hashes to peer`)
            peer.send(CreateP2Pmsg(CstP2P.INVENTORY, peerNeededHashes))
          })
          .catch(err => console.error(err))
        break

      case CstP2P.INVENTORY:
        // save needed hashes
        this.BlockChain.NeededHashes = this.BlockChain.NeededHashes.concat(msg.payload)
        // ask for blocks with  hashes that are available with this connected peer
        AskNeededBlocks(msg.payload, peer)
        break

      case CstP2P.GETBLOCK:
        Debug(`Peer asked for block with hash ${msg.payload}`)
        this.BlockChain.GetBlockWithHash(msg.payload)
          .then(block => peer.send(CreateP2Pmsg(CstP2P.BLOCK, block)))
          .catch(err => console.error(err))
        break

      case CstP2P.MESSAGE:
        Debug('Incoming message')
        Incoming.Msg(msg.payload, this.BlockChain)
          .then(() => Debug('Incoming message saved'))
          .catch(err => console.error(err))
        break


      default: peer.send(CreateP2Pmsg(CstP2P.NACK, null))
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
      connection.on('error', error => Debug(`P2P connection error to ${remoteIP}:${remotePort} \n ${error}`))

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

  // send Version msg and best hash msg
  SendHandshake(connection, remoteIP, remotePort) {
    return new Promise((resolve, reject) => {
      Debug(`Connected to peer ${remoteIP}`)

      // save Outgoing connection to broadcast later
      this.OutgoingConnections.push(connection)
      Debug('Sending Version message')
      connection.send(CreateP2Pmsg(CstP2P.VERSION, this.BlockChain.Version))

      // send hash of this blockchain
      this.BlockChain.GetBestHash()
        .then((hash) => {
          Debug('Sending best hash')
          connection.send(CreateP2Pmsg(CstP2P.HASH, hash))
          return resolve(`P2P handshake done with ${remoteIP}:${remotePort}`)
        })
        .catch(err => reject(new Error(`ERROR sending best hash ${err}`)))
    })
  }

  // close connection
  Close() {
    this.Server.close()
  }
}

module.exports = P2P
