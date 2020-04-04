
const Cst = {
  HashAlgorithm: 'sha256',

  GenesisTimestamp: 1525962288078,
  GenesisMsg: 'Genesis Message',
  GenesisAddress: 'SPICE_90578a62de4a4ca9ee16ac33c359ce88b8549054c37d1a7523b9218abed7325c',
  GenesisHashBlock: '27828e15142022d19baddaecaf0b2ba5cb89975cd40ca02ed3589319cb3ff80d',
  GenesisSignature: '', // '3040021e1711a6e87012949729cab8f129c9adb006d129315d34ba9fb227824a70a7021e060abbb7934d20e8a8f784a2b668d005987d439b2eee2e2c07cc366a6f72',
  GenesisPubKey: '',
  GenesisMsgId: null,
  GenesisNonce: 0,
  GenesisDiff: 2,

  StartDiff: 4,
  PrivateKeySize: 10,
  AddressPrefix: 'SPICE_',
  MiningStartEveryMinutes: 15,

  PrivateKey: 'privateKey',
  PublicKey: 'publicKey',
  PubFile: 'pub.der',
  PrivFile: 'priv.key',
  KeyDir: './Keys/',

  Db: {
    DefaultDataDir: './data',
    DefaultPort: 27017,
    DefaultServerIP: '127.0.0.1', // 'host.docker.internal',
    Name: 'BlockJS',
    Docs: {
      PendingMessages: 'PendingMessages',
      Blockchain: 'Blockchain',
      Address: 'Address',
      IncomingBlocks: 'IncomingBlocks',
    },
  },

  P2P: {
    DefaultServerPort: 2000,
    CONNECTED: 'CONNECTED',
    RECEIVED: 'RECEIVED',
    BLOCK: 'BLOCK',
    VERSION: 'VERSION',
    ACK: 'ACK',
    NACK: 'NACK',
    HASH: 'HASH',
    INVENTORY: 'INVENTORY',
    GETBLOCK: 'GETBLOCK',
    MESSAGE: 'MESSAGE',
  },

  API: {
    Root: '/api',
    IP: '0.0.0.0',
    DefaultPort: 2100,
    Cmd: {
      Address: '/Address',
      AmountPeers: '/AmountPeers',
      BlockAtHeight: '/BlockAtHeight/:height',
      Diff: '/Diff',
      CheckMsgExist: '/CheckMsgExist',
      ConnectPeer: '/ConnectPeer',
      FindMsgID: '/FindMsgID',
      GetBlockWithHash: '/GetBlockWithHash/:hash',
      Height: '/Height',
      Info: '/Info',
      LastHash: '/LastHash',
      LastBlock: '/LastBlock',
      MinerStart: '/MineStart',
      MinerStop: '/MineStop',
      PendingAmount: '/PendingAmount',
      PendingAll: '/PendingAll',
      PeersDetails: '/PeersDetails',
      SendMsg: '/SendMsg',
      Stop: '/Stop',
      Verify: '/Verify',
      Help: '/Help',
    },
  },
}

const CstTxt = {
  BlockchainVersion: 'Blockchain version',
  ApiName: 'BlockJS API',
  InfoTitle: 'BLOCKCHAIN INFO',
  PeerInfoTitle: 'PEER INFO',
  Version: 'Version',
  APIpassword: 'API password is',
  PeersConnectedTitle: 'Connected peers:',
  Started: 'started',
  Stopped: 'Database connection closed, P2P connections closed',
  P2Pclosed: 'Server stopped, all in/outgoing connections are closed',
  Port: 'port',
  Address: 'Address',
  Block: 'Block',
  Height: 'Height',
  Diff: 'Difficulty',
  LastHash: 'Last hash',
  Pending: 'Pending messages',
  MiningFound: 'Found a new block !!',
  MinerRunning: 'Miner running',
  Mining: 'Currently mining',
  Syncing: 'Currently syncing',
  MiningFoundBlock: 'Created a block',
  MiningAfter: 'after ',
  MiningAborted: 'Mining was aborted, ignore result',
  ListCmds: 'API commands:',
  // IncomingBlockNeedMore: 'Waiting for more needed blocks before evaluating them',
  IncomingBlockInvalid: 'Incoming p2p block is not valid',
  IncomingBlockNotNext: 'Incoming block is not next block in non-sync mode --> ignore block',
  IncomingBlockAllReceived: 'Received all needed blocks, start evaluating them now',
  IncomingBlockAdded: 'added in blockchain',
  IncomingBlockStored: 'Block stored in IncomingBlocks collection',
  IncomingBlocksEvaluatedDone: 'All stored blocks are evaluated',
  IncomingBlockAlreadyKnow: 'Incoming block already in blockchain, don\'t need to evaluate',
  // eslint-disable-next-line max-len
  IncomingBlockPrevNotKnown: '.', // 'Previous block is not in the blockchain, keep block in stored incoming blocks, will need to evaluate again',
  IncomingBlockNewHeight: 'Height of new incoming block will be',
  IncomingBlockProcessResult: 'Incoming block evaluated:',
  IncomingBlockReprocess: 'Still needs evaluation',
  IncomingBlockAllProcessed: 'All blocks are evaluated',
  IncomingHashNeedsSync: 'This node needs syncing ! Wait for incoming inventory message',
  IncomingHashKnown: 'Incoming hash is known, create inventory message for peer',
  P2Plistening: 'Listening on port',
  P2PincomingConnection: 'Incoming connection from',
  P2PincomingConnectionPort: 'on port',
  P2Pbroadcast: 'Broadcasting a',
  P2Pmsg: 'p2p message',
  P2PconnectedVersion: 'Connected to a peer on version',
  P2PincomingBlock: 'Received a block',
  P2PincomingBlockDone: 'Incoming block added to local blockchain copy',
  P2PconnectedBestHash: 'Connected peer best hash',
  P2PsendInv: 'Send Inv with ',
  P2PsendInv2: 'hashes to peer',
  P2PalreadyConnected: 'Already connected to this peer',
  P2Pinv: 'Received INV message with',
  P2PgetBlock: 'Peer asked for block with hash ',
  P2PpendingMsg: 'Received a pending message',
  P2PpendingMsgForward: 'Forward received message to peers',
  P2PaskForAblock: 'Send GETBLOCK message for hash',

}

const CstError = {
  HeightNotNumber: 'Height is not a number.',
  HashNotString: 'Hash is not a string',
  SendNotMsg: 'SendMsg: argument is not a message',
  SendNoContent: 'SendMsg: Empty message supplied',
  SendNoValid: 'SendMsg: message is not valid',
  MultiBlocks: 'Multiple blocks found',
  SameHeigh: 'with height',
  SameHash: 'with hash',
  ParseBlock: 'Could not parse block',
  ParseBlockWrongHash: 'The hash of the parsed block is not valid',
  NotBlock: 'argument is not a block',
  BlockInvalid: 'Block is not valid',
  BlockHeaderIncomplete: 'Block header incomplete',
  GenesisNotCreated: 'Could not create genesis block',
  GenessisNotAdded: 'cannot create/save genesis block',
  GenessisNotFirst: 'First block is not the genesis block',
  DbNotConnected: 'Cannot connect to the database',
  DbNotSaved: 'ERROR saving to the database: ',
  DbNotUpdate: 'ERROR updating to the database: ',
  DbNotFind: 'ERROR finding in the database: ',
  DbCounting: 'ERROR counting docs in the database',
  DbRemoveAll: 'ERROR removing all documents',
  DbRemoveOne: 'ERROR removing one document with',
  DbToCollection: 'with the collection: ',
  DbData: 'the data',
  DbFilter: 'filter:',
  MsgNoFrom: 'ERROR message is not valid: no from address',
  msgHashInvalid: 'ERROR message hash is not valid for content',
  MineNotSync: 'Cannot mine a block, BlockChain node needs syncing',
  P2PconnectNoIP: 'No remote IP address provided',
  P2PconnectNoPort: 'No remote port provide',
  CannotFindBlockForHash: 'Cannot find block with hash',
  CannotGetBestHash: 'Cannot find best hash',
  PreviousHashNotInBlockchain: 'Previous hash is found in blockchain',
  MinerCmdInvalid: 'Cannot start or stop the miner',
}

const CstHelp = {
  [Cst.API.Cmd.Address]: 'Get own address',
  [Cst.API.Cmd.AmountPeers]: 'Amount of connected peers',
  [Cst.API.Cmd.BlockAtHeight]: 'Get block at specified height: /BlockAtHeight/:height',
  [Cst.API.Cmd.Diff]: 'Show PoW difficulty',
  [Cst.API.Cmd.CheckMsgExist]: 'Provide content, check if the message exists in the blockchain',
  [Cst.API.Cmd.ConnectPeer]: 'Connect to provided remoteIP (and optional remotePort)',
  [Cst.API.Cmd.FindMsgID]: 'Get message by Id',
  [Cst.API.Cmd.GetBlockWithHash]: 'Get block of specified hash: /GetBlockWithHash/:hash',
  [Cst.API.Cmd.Height]: 'Current height of the blockchain',
  [Cst.API.Cmd.Info]: 'Information of the blockchain',
  [Cst.API.Cmd.LastHash]: 'Last hash of the blockchain',
  [Cst.API.Cmd.LastBlock]: 'Last block',
  [Cst.API.Cmd.MinerStart]: 'Start the miner',
  [Cst.API.Cmd.MinerStop]: 'Stop the miner',
  [Cst.API.Cmd.PendingAmount]: 'Amount of pending messages to be mined',
  [Cst.API.Cmd.PendingAll]: 'Show all pending messages',
  [Cst.API.Cmd.PeersDetails]: 'Show connected peers',
  [Cst.API.Cmd.SendMsg]: 'Send a message, will be stored in the next block',
  [Cst.API.Cmd.Stop]: 'Stop this node: close database connection and all P2P connections',
  [Cst.API.Cmd.Verify]: 'Verify each block in the blockchain',
  [Cst.API.Cmd.Help]: 'Show this help',
}

module.exports = {
  Cst, CstTxt, CstError, CstHelp,
}
