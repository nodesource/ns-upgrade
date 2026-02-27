const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const localUtils = require('local-utils')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.get('/', (req, res) => {
  const data = {
    message: 'Legacy Express 3.x Demo App',
    nodeVersion: process.version,
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    lodashVersion: lodash.VERSION,
    utilResult: localUtils.greet('Docker Test')
  }
  res.json(data)
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Node.js version: ${process.version}`)
  })
}

module.exports = app
