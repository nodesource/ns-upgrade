const express = require('express')
const _ = require('lodash')
const moment = require('moment')

const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  const data = {
    message: 'Demo app running on Node.js 13',
    nodeVersion: process.version,
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    randomNumber: _.random(1, 100)
  }
  res.json(data)
})

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Node.js version: ${process.version}`)
  })
}

module.exports = app
