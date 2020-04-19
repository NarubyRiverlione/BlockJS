# BlockJS (WIP)


## Install via Docker ##
To setup the node & database containers use this `docker-compose.yml`
```
version: "3"
services:
 blockjs:
  image: naruby/blockjs
  networks:
    - DbNet
    - default
  ports:
    - "2000:2000"   # P2P
    - "2100:2100"   # API   
  environment:
    dbServer: database
  depends_on: 
      - database
    
 database:
  image: mongo
  restart: always
  networks:
    - DbNet


networks: 
  DbNet:
    internal: true
```

## Why oh why ##
Yes I know, yet an other blockchain project…

There are indeed already many great articles about blockchain with javascript, But all the once I found don’t have persistent storage. Every time you restart the node application a new blockchain is forged with a genesis block. Each consecutive mined block is stored only in memory. This is my challenge: make persistent blockchain with javascript.


(start reading speed X5)
Let’s gets first get  the disclaimers out of the way
This is a pure educational project. By no means is this a secure blockchain nor is this an attempt in creating one.
It would be very irresponsible to use this as a template for launching a new crypto currency.
I would be very pleased with any feedback but please don’t hold it against me if I response to a question in line of “..why did you use X and not Y…” with “..because I never heard of Y..”
I only have a couple of years of javascript experience and that’s the main reason for me to tackle this project: to learn.
(back to normal reading speed)

### Persistent storage ###
This project uses the noSQL database mongoDB with the native nodejs driver to store the blockchain.
You can use a stand alone mongoDb. Docker-compose with will spool up beside the blockchain node also a mongoDb container.

### Peer-to-peer communication ###
Exchanging blocks via p2p, I’ve opted to use the websocket ws implementation. Again I was in sought between socket.io or websocket 
The default p2p port in 2000

## Rest API ##
Client - server communication is via a rest api, default on port 2100.
See postman documentation https://web.postman.co/collections/4469958-26c7ab12-04ae-4c46-8388-33f58d30c53e?workspace=2b5e76a5-39ed-4a74-a8b4-30b375d7d318

### API connection ###
Basic authentication is used : 

user = 'APIuser'

password is set via environment varible _apiPassword_ or a random password is created and show when a node is starting.


## Config ##
Changing ports can be done via the environment variables

`dbServer`  ip address if the mongoDb server

`dbPort` 	  port of the mongoDb server

`Port`      p2p port

`apiPort`   api port

## Mine the Genesis block to start a new blockchain ##
Set in Const.js the _GenesisNonce : null_ to mine a new Genesis block. The hash, nonce, signature & public key will be outputted.

Add the new nonce to the Cst.js file in _GenesisNonce_ 

