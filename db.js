const dotenv = require("dotenv")
dotenv.config()
const mongodb = require('mongodb')

const connectionString = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.pe1k3.mongodb.net/ComplexApp?retryWrites=true&w=majority`

mongodb.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, client) {
  module.exports = client.db()
  const app = require('./app')
  app.listen(process.env.PORT)
})