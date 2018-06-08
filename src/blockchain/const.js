
const Const = {
  GenesisReward: 10000,
  GenesisTimestamp: 1525962288078,
  GenesisMsg: 'Genesis Message',
  GenesisAddress: 'SPICE_707d6653b0b81d679313',
  GenesisHash: '2a6da0913f4d01a3233c9452346b042243f5e3c8b431a124aed9d787a9bb6ef8',
  GenesisTxHash: 'a172cf1b97af949009b589822c86b72f5f09cdd5a3448048b754329734733b4a',

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
      Wallet: 'Wallet',
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
    IP: '0.0.0.0',
    DefaultPort: 9000,
  },
}

module.exports = Const
