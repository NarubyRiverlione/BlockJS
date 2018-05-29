
const Const = {
  GenesisReward: 10000,
  GenesisTimestamp: 1525962288078,
  GenesisRewardWallet: 'Genesis Reward Wallet',
  GenesisAddress: 'SPICE_707d6653b0b81d679313',
  GenesisHash: '7b4735604f33b769ce76e8c4e2d243296ee57e7f968c54c6002037c5b4f0f23b',
  GenesisTxHash: '4ea5c508a6566e76240543f8feb06fd457777be39549c4016436afda65d2330e',

  StartBlockReward: 10,
  StartDiff: 2,
  PrivateKeySize: 10,
  DefaultServerPort: 2000,
  AddressPrefix: 'SPICE_',

  Db: {
    DefaultDataDir: './data',
    DefaultPort: 27017,
    Name: 'BlockJS',
    Docs: {
      PendingTransactions: 'PendingTransactions',
      Blockchain: 'Blockchain',
      Wallet: 'Wallet',
      OwnTx: 'OwnTx',
      OrphanBlocks: 'OrphanBlocks',
      IncomingBlocks: 'IncomingBlocks',
    },
  },

  P2P: {
    CONNECTED: 'CONNECTED',
    RECIEVED: 'RECEIVED',
    BLOCK: 'BLOCK',
    VERSION: 'VERSION',
    ACK: 'ACK',
    NACK: 'NACK',
    HASH: 'HASH',
    INVENTORY: 'INVENTORY',
    GETBLOCK: 'GETBLOCK',
  },

  API: {
    Root: '/api',
    IP: '0.0.0.0',
    DefaultPort: 9000,
  },
}

module.exports = Const
