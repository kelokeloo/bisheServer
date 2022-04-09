const { MongoClient } = require('mongodb');

const dbName = 'music'

const url = `mongodb://localhost:27017/${dbName}`;

const client = new MongoClient(url)

module.exports = {
  client,
  dbName
}



