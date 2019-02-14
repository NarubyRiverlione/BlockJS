
const Cst = {
  GenesisReward: 10000,
  GenesisTimestamp: 1525962288078,
  GenesisMsg: 'Genesis Message',
  GenesisAddress: 'SPICE_707d6653b0b81d679313',
  GenesisHashBlock: '182c67d43f333b962f88e1c7780c7650fc79f5a8dc23e8826bdbfe5d757f482f',
  GenesisHashMessages: '6864320b5f8c28368ca6c7bb4395406625be41565c90a9fc927abe81ae248456',
  GenesisHashMsg: '256100c3eaa459e608ffd425bab68e08b66a649b8da8c86306caef2da482e58d',

  StartDiff: 2,
  PrivateKeySize: 10,
  DefaultServerPort: 2000,
  AddressPrefix: 'SPICE_',

  Db: {
    DefaultDataDir: './data',
    DefaultPort: 27017,
    Name: 'BlockJS',
    Docs: {
      PendingMessages: 'PendingMessages',
      Blockchain: 'Blockchain',
      Address: 'Address',
      IncomingBlocks: 'IncomingBlocks',
    },
  },

  P2P: {
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
    IP: '127.0.0.1', // '0.0.0.0',
    DefaultPort: 2100,
    Cmd: {
      Height: '/Height',
      Address: '/Address',
      Info: '/Info',
      Diff: '/Diff',
      LastHash: '/LastHash',
      PendingAmount: '/PendingAmount',
      PendingAll: '/PendingAll',
      LastBlock: '/LastBlock',
      BlockAtHeight: '/BlockAtHeight/:height',
      GetBlockWithHash: '/GetBlockWithHash/:hash',
      Mine: '/Mine',
      AmountPeers: '/AmountPeers',
      PeersDetails: '/PeersDetails',
      SendMsg: '/SendMsg',
      CheckMsgExist: '/CheckMsgExist',
      ConnectPeer: '/ConnectPeer',
    },
  },
}

const CstTxt = {
  ApiName: 'BlockJS API',
  InfoTitle: 'BLOCKCHAIN INFO',
  PeerInfoTitle: 'PEER INFO',
  PeersConnectedTitle: 'Connected peers:',
}

const CstError = {
  HeightNotNumber: 'Height is not a number.',
  HashNotString: 'Hash is not a string',
}


module.exports = { Cst, CstTxt, CstError }
