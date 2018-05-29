
const MongoClient = require('mongodb').MongoClient // eslint-disable-line
const Debug = require('debug')('blockjs:DB')

const CstDB = require('./const.js').Db

class Db {
  constructor() {
    this.client = null
  }

  Connect(DbServer, DbPort) {
    return new Promise((resolve, reject) => {
      // Connection URL
      const url = `mongodb://${DbServer}:${DbPort}`
      // Use connect method to connect to the server
      MongoClient.connect(url)
        .then((client) => {
          Debug(`Connected successfully to DB server ${DbServer} port ${DbPort}`)
          this.client = client
          this.db = (client.db(CstDB.Name))
          resolve()
        })
        .catch(error => reject(new Error(`Cannot connect to DB ${DbServer} port ${DbPort}: ${error}`)))
    })
  }

  Close() {
    this.client.close()
  }

  async Add(col, data) {
    try {
      const result = await this.db.collection(col).insertOne(data)
      Debug(`Added ${col} in db`)
      return result
    } catch (err) {
      const error = `ERROR saving to db: ${err} to this collection "${col}"  with  data "${data}"`
      return (error)
    }
  }

  // filter = {field:value }, update = {field:newValue}
  async Update(col, filter, update) {
    try {
      const collection = this.db.collection(col)
      const result = await collection.updateOne(filter, { $set: update })
      Debug(`Update ${col} in db`)
      return result
    } catch (err) {
      const error = `ERROR updating: ${err} to this collection "${col}", filter: ${filter}  and update "${update}"`
      return (error)
    }
  }

  FindMax(col, property) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      const sortMax = { [property]: -1 }
      collection.find().sort(sortMax).limit(1).toArray()
        .catch((err) => {
          const error = new Error(`ERROR finding max "${property}" from db the collection "${col}": ${err}" `)
          reject(error)
        })
        .then(docs =>
          resolve(docs[0]))
    })
  }

  Find(col, filter) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      collection.find(filter).toArray()
        .catch((err) => {
          const error = new Error(`ERROR finding with filter "${filter}" from db the collection "${col}": ${err.message}" `)
          reject(error)
        })
        .then(docs => resolve(docs))
    })
  }

  FindSelect(col, filter, select) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      collection.find(filter).project(select).toArray()
        .catch((err) => {
          const error = new Error(`ERROR finding with filter "${filter}" from db the collection "${col}": ${err}" `)
          reject(error)
        })
        .then(docs => resolve(docs))
    })
  }
  FindOne(col, filter) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      collection.findOne(filter)
        .catch((err) => {
          const error = new Error(`ERROR finding with filter "${filter}" from db the collection "${col}": ${err}" `)
          reject(error)
        })
        .then(doc => resolve(doc))
    })
  }
  CountDocs(col) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      collection.count()
        .catch((err) => {
          const error = new Error(`ERROR counting docs  db the collection "${col}": ${err}" `)
          reject(error)
        })
        .then(count => resolve(count))
    })
  }

  RemoveAllDocs(col) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      collection.deleteMany()
        .catch((err) => {
          const error = new Error(`ERROR removing all docs form the collection "${col}": ${err}" `)
          reject(error)
        })
        .then(result => resolve(result))
    })
  }
  RemoveOne(col, filter) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      collection.deleteOne(filter)
        .catch((err) => {
          const error = new Error(`ERROR removing one document with filter "${filter}" from db the collection "${col}": ${err}" `)
          reject(error)
        })
        .then(doc => resolve(doc))
    })
  }
}

module.exports = Db
