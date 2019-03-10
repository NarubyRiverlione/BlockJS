
const { MongoClient } = require('mongodb')
const Debug = require('debug')('blockjs:DB')

const { Cst, CstError, CstTxt } = require('../Const.js')

const { Db: CstDB } = Cst

class Db {
  constructor() {
    this.client = null
  }

  Connect(DbServer, DbPort) {
    return new Promise((resolve, reject) => {
      // Connection URL
      const url = `mongodb://${DbServer}:${DbPort}`
      // Use connect method to connect to the server
      MongoClient.connect(url, { useNewUrlParser: true })
        .then((client) => {
          Debug(`Connected successfully to DB server ${DbServer} ${CstTxt.Port} ${DbPort}`)
          this.client = client
          this.db = (client.db(CstDB.Name))
          resolve()
        })
        .catch(error => reject(new Error(`${CstError.DbNotConnected} ${DbServer} ${CstTxt.Port} ${DbPort}: ${error}`)))
    })
  }

  Close() {
    this.client.close()
  }

  Add(col, data) {
    return new Promise((resolve, reject) => {
      const SaveData = { ...data } // make a copy to prevent mutation by adding _id
      this.db.collection(col).insertOne(SaveData)
        .then((result) => {
          Debug(`Added in db to the ${col}`)
          return resolve(result)
        })
        .catch((err) => {
          const error = `${CstError.BlockInvalid} ${err} ${CstError.DbToCollection} "${col}"  ${CstError.DbData} "${SaveData}"`
          return reject(error)
        })
    })
  }

  // filter = {field:value }, update = {field:newValue}
  async Update(col, filter, update) {
    try {
      const collection = this.db.collection(col)
      const result = await collection.updateOne(filter, { $set: update })
      Debug(`Update ${col} in db`)
      return result
    } catch (err) {
      const error = `${CstError.DbNotUpdate} ${err} ${CstError.DbToCollection} "${col}", ${CstError.DbFilter}
       ${filter} ${CstError.DbData} "${update}"`
      return (error)
    }
  }

  FindMax(col, property) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      const sortMax = { [property]: -1 }
      collection.find().sort(sortMax).limit(1).toArray()
        .catch((err) => {
          const error = new Error(`${CstError.DbNotFind} max "${property}" ${CstError.DbToCollection} "${col}": ${err} " `)
          reject(error)
        })
        .then(docs => resolve(docs[0]))
    })
  }

  Find(col, filter) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      collection.find(filter).toArray()
        .catch((err) => {
          console.error(err)
          const error = new Error(`${CstError.DbNotFind} ${CstError.DbFilter} "${filter}" ${CstError.DbToCollection} "${col}": ${err.message}" `)
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
          const error = new Error(`${CstError.DbNotFind} ${CstError.DbFilter} "${filter}" ${CstError.DbToCollection} "${col}": ${err.message}"`)
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
          const error = new Error(`${CstError.DbNotFind} ${CstError.DbFilter} "${filter}" ${CstError.DbToCollection} "${col}": ${err.message}" `)
          reject(error)
        })
        .then(doc => resolve(doc))
    })
  }

  CountDocs(col) {
    return new Promise((resolve, reject) => {
      const collection = this.db.collection(col)
      collection.countDocuments()
        .catch((err) => {
          const error = new Error(`${CstError.DbCounting} ${CstError.DbToCollection} "${col}": ${err}" `)
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
          const error = new Error(`${CstError.DbRemoveAll} ${CstError.DbToCollection} "${col}": ${err}" `)
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
          const error = new Error(`${CstError.DbRemoveOne} ${CstError.DbFilter} "${filter}" ${CstError.DbToCollection} "${col}": ${err}" `)
          reject(error)
        })
        .then(doc => resolve(doc))
    })
  }
}

module.exports = Db
