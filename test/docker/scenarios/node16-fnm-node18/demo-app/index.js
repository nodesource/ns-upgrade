const express = require('express')
const jwt = require('jsonwebtoken')
const localMiddleware = require('local-middleware')

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret'

// Middleware
app.use(express.json())
app.use(localMiddleware.requestLogger)

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Demo Microservice',
    version: '1.0.0',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})

app.post('/auth/register', async (req, res) => {
  try {
    const { username } = req.body

    // Create token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' })

    res.json({
      success: true,
      message: 'User registered',
      token
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/protected', localMiddleware.authenticateToken(JWT_SECRET), (req, res) => {
  res.json({
    message: 'Protected data',
    user: req.user
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Microservice running on port ${PORT}`)
    console.log(`Node.js version: ${process.version}`)
  })
}

module.exports = app
