# BlockJS (WIP)

Yes I know, yet an other blockchain project…

There are indeed already many great articles about blockchain with javascript, I’ve reference some of them at the end. But all the once I found don’t have persistent storage. Every time you restart the node application a new blockchain is forged with a genesis block. Each consecutive mined block is stored only in memory. This is my challenge: make persistent blockchain with javascript.

(start reading speed X5)
Let’s gets first get  the disclaimers out of the way
This is a pure educational project. By no means is this a secure blockchain nor is this an attempt in creating one.
It would be very irresponsible to use this as a template for launching a new crypto currency.
I would be very pleased with any feedback but please don’t hold it against me if I response to a question in line of “..why did you use X and not Y…” with “..because I never heard of Y..”
I only have 1 year of javascript experience and that’s the main reason for me to tackle this project: to learn.
(back to normal reading speed)

I’m planning on writing a series of articles that are inline with my progress in the project:
### Creating a blockchain in memory ###
it would be very hard to dive into the code with all the persistent storage without some basic explication of the elementary blockchain elements (message, block, blockchain) 

### Persistent storage ###
I will the noSQL database  mongoDB with the native nodejs driver to store the blockchain. I did know about using mongoose as I have some previous experience with it. But as I’ve defined my classes in part 1 it feels wrong to use mongoose models. Time will tell if this was a right call. 

### Peer-to-peer communication ###
Exchanging blocks via p2p, I’ve opted to use the websocket ws implementation. Again I was in sought between socket.io or websocket 

### Rest API ###
Client - server communication
