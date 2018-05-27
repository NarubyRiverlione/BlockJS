const WebSocket = require('ws')
const Debug = require('debug')('blockjs:p2p')
const Cst = require('./const.js')
const Block = require('./block.js')

/*
inbound HashMsg -> send InvMsg([received Hash ... best hash])
inbound InvMsg(neededHashes) ->  AskNeededBlocks:  send x GetBlockMsg(hash)
inbound GetBlockMsg(hash) -> SendBlockMsg(hash)
inbound BlockMsg(block) ->IncomingBlock(block):  add to local blockchain
*/

const AckMsg =
  JSON.stringify({ type: Cst.P2PNACK, payload: null })
const NakMsg =
  JSON.stringify({ type: Cst.P2P.NACK, payload: null })

const ConnectedMsg =
  JSON.stringify({ type: Cst.P2P.CONNECTED, payload: null })

const VersionMsg = version =>
  JSON.stringify({ type: Cst.P2P.VERSION, payload: version })

const HashMsg = hash =>
  JSON.stringify({ type: Cst.P2P.HASH, payload: hash })

const InvMsg = availableHashs =>
  JSON.stringify({ type: Cst.P2P.INVENTORY, payload: availableHashs })

const GetBlockMsg = hash =>
  JSON.stringify({ type: Cst.P2P.GETBLOCK, payload: hash })

// FIXME sends a Block object, icl __proto__
const BlockMsg = block =>
  JSON.stringify({ type: Cst.P2P.BLOCK, payload: block })


const AskNeededBlocks = (neededHashs, peer) => {
  neededHashs.forEach((hash) => {
    peer.send(GetBlockMsg(hash))
  })
}
class P2P {
  constructor(port, coin) {
    this.server = new WebSocket.Server({
      port,
      clientTracking: true, // keep list of connected peers
    })

    this.Coin = coin

    // start listening
    this.server.on('listening', () => { Debug(`Listening on port ${port}`) })
    // incoming connections -> setup message handle + send info of own peer
    this.IncommingConnectionHandle()
    // handle a connection disconnect
    this.server.on('close', () => { Debug('peer has disconnected') })
    // handle error
    this.server.on('error', () => { Debug('error') })
  }

  // peer connects = send ACK + send Version msg and BestHash msg
  IncommingConnectionHandle() {
    this.server.on('connection', (peer, req) => {
      // setup message handle
      peer.on('message', (message) => { this.MessageHandle(message, peer) })

      const { remoteAddress, remotePort } = req.connection
      Debug(`Incomming connection from ${remoteAddress} on port ${remotePort}`)

      // send Connected Msg
      peer.send(ConnectedMsg)
      // send version of this peer
      peer.send(VersionMsg(this.Coin.Version))
      // send hash of this blockchain
      this.Coin.GetBestHash()
        .then(hash => HashMsg(peer, hash))
        .catch(err => console.error(err))
    })
  }

  // send message to all connected peers
  Broadcast(msg) {
    this.server.clients.forEach((peer) => {
      peer.send(msg)
    })
  }

  // evaluate message
  MessageHandle(message, peer) {
    const msg = JSON.parse(message)
    // Debug(`Received: "${msg.type} from peer `) // ${remoteIP}`)
    // Debug(JSON.stringify(msg.payload))

    switch (msg.type) {
      case Cst.P2P.RECIEVED:
      case Cst.P2P.ACK:
      case Cst.P2P.NACK:
      case Cst.P2P.CONNECTED:
        break// prevent endless loop

      case Cst.P2P.VERSION:
        Debug(`Connected to peer version ${msg.payload}`)
        break

      case Cst.P2P.BLOCK:
        this.Coin.IncomingBlock(msg.payload)
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
        this.Coin.IncomingHash(msg.payload)
          // send hashes that peers doesn't have
          .then((peerNeededHashs) => {
            Debug(`Send Inv with ${peerNeededHashs.length} hashs to peer`)
            peer.send(InvMsg(peerNeededHashs))
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

      default: peer.send(NakMsg)
    }
  }

  // Connect to a peer, send version + best hash
  Connect(remoteIP, remotePort) {
    Debug(`Connecting to peer ${remoteIP} on port ${remotePort}`)
    const connection = new WebSocket(`ws://${remoteIP}:${remotePort}`)

    // prepare to get info from connection
    connection.on('message', (message) => { this.MessageHandle(message, connection) })

    // send own  info
    connection.on('open', () => {
      connection.send(VersionMsg(this.Version))
      // send hash of this blockchain
      this.Coin.GetBestHash()
        .then(hash => connection.send(HashMsg(hash)))
        .catch(err => console.error(err))
    })
  }

  Close() {
    this.server.close()
  }
}

module.exports = P2P
