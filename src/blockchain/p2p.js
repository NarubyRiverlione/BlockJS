const WebSocket = require('ws')
const Debug = require('debug')('blockjs:p2p')
// const { IsValidBlock } = require('./block.js')
const Incoming = require('./incoming.js')

const { Cst, CstError, CstTxt } = require('../Const.js')

const { P2P: CstP2P } = Cst

/*
HASH: inbound HashMsg -> send InvMsg([received Hash ... best hash])
INV: inbound InvMsg(neededHashes) ->  AskNeededBlocks:  send x GetBlockMsg(hash)
GETBLOCK: inbound GetBlockMsg(hash) -> SendBlockMsg(hash)
BLOCK: inbound BlockMsg(block) ->IncomingBlock(block):  add to local blockchain
VERSION: handshake version
*/

const CreateP2Pmsg = (type, payload) => JSON.stringify({ type, payload })

const AskNeededBlocks = (neededHashes, peer) => {
  neededHashes.forEach((hash) => {
    Debug(`${CstTxt.P2PaskForAblock} ${hash}`)
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
    this.Server.on('listening', () => { Debug(`${CstTxt.P2Plistening} ${port}`) })
    // incoming connections -> setup message handle + send info of own peer
    this.SetupIncomingConnectionHandle()
    // stop server, disconnect all peers
    this.Server.on('close', () => {
      Debug(CstTxt.P2Pclosed)
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
      Debug(`${CstTxt.P2PincomingConnection} ${remoteAddress} ${CstTxt.P2PincomingConnectionPort} ${remotePort}`)
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
    Debug(`${CstTxt.P2Pbroadcast} ${type} ${CstTxt.P2Pmsg}`)
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

    switch (msg.type) {
      case CstP2P.RECEIVED:
      case CstP2P.ACK:
      case CstP2P.NACK:
      case CstP2P.CONNECTED:
        break// prevent endless loop

      // received version of peer
      case CstP2P.VERSION:
        Debug(`${CstTxt.P2PconnectedVersion} ${msg.payload}`)
        break

      /* received a block
      --> evaluate block to deicide if to add it in or blockchain copy
       --> if it's a new top block it will be forwarded to all known peers
       (in the CheckIfBlockIsNewTop function in incoming.js) */
      case CstP2P.BLOCK:
        Debug(CstTxt.P2PincomingBlock)
        Incoming.Block(msg.payload, this.BlockChain)
          .then(result => Debug(result))
          .catch(err => console.error(err))
        break

      // received (best) hash of a peer
      // --> send INV message to peer with hash he doesn't have
      case CstP2P.HASH:
        Debug(`${CstTxt.P2PconnectedBestHash} ${msg.payload}`)
        Incoming.Hash(msg.payload, this.BlockChain)
          // send hashes that peers doesn't have
          .then((peerNeededHashes) => {
            Debug(`${CstTxt.P2PsendInv} ${peerNeededHashes.length} ${CstTxt.P2PsendInv2}`)
            peer.send(CreateP2Pmsg(CstP2P.INVENTORY, peerNeededHashes))
          })
          .catch(err => console.error(err))
        break

      // received hashes a peer has and this node not yet
      // --> ask voor each needed block via sending a GETBLOCK message
      case CstP2P.INVENTORY:
        Debug(`${CstTxt.P2Pinv} ${msg.payload.length} hashes`)
        // save needed hashes
        this.BlockChain.NeededHashes = this.BlockChain.NeededHashes.concat(msg.payload)
        // ask for blocks with  hashes that are available with this connected peer
        AskNeededBlocks(msg.payload, peer)
        break

      // received request for a block
      // --> send the block via a BLOCK message
      case CstP2P.GETBLOCK:
        Debug(`${CstTxt.P2PgetBlock} ${msg.payload}`)
        this.BlockChain.GetBlockWithHash(msg.payload)
          .then(block => peer.send(CreateP2Pmsg(CstP2P.BLOCK, block)))
          .catch(err => console.error(err))
        break

      // received a pending message
      // --> store in the PendingMessage collection for mining later
      // --> forward the pending message to all know peers
      case CstP2P.MESSAGE:
        Debug(Cst.P2PpendingMsg)
        Incoming.Msg(msg.payload, this.BlockChain)
          .then((pendingMsg) => {
            if (pendingMsg) {
              // only forward received message when it's new for this node
              // to prevent endless loop
              Debug(CstTxt.P2PpendingMsgForward)
              this.Broadcast(CstP2P.MESSAGE, pendingMsg)
            }
          })
          .catch(err => console.error(err))
        break


      default: peer.send(CreateP2Pmsg(CstP2P.NACK, null))
    }
  }

  // Connect to a peer, send version + best hash
  Connect(remoteIP, remotePort) {
    return new Promise(async (resolve, reject) => {
      if (!remotePort) {
        return reject(new Error(CstError.P2PconnectNoIP))
      }
      if (!remotePort) {
        return reject(new Error(CstError.P2PconnectNoPort))
      }
      const ConnectionUrl = `ws://${remoteIP}:${remotePort}`
      const ExistingConnection = this.OutgoingConnections.find(conn => conn.url === ConnectionUrl)
      if (ExistingConnection) {
        return reject(new Error(`${CstTxt.P2PalreadyConnected} ${remoteIP} on port ${remotePort}`))
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
      connection.on('error', error => new Error(`P2P connection error to ${remoteIP}:${remotePort} \n ${error}`))
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
          Debug(`Sending best own hash: ${hash}`)
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
