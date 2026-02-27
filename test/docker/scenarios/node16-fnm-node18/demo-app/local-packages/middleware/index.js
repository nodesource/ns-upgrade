/**
 * Local middleware utilities for microservice
 */

const jwt = require('jsonwebtoken')

function requestLogger (req, res, next) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.url}`)
  next()
}

function authenticateToken (secret) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' })
      }
      req.user = user
      next()
    })
  }
}

function corsMiddleware (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }

  next()
}

function rateLimiter (maxRequests = 100, windowMs = 60000) {
  const requests = new Map()

  return (req, res, next) => {
    const ip = req.ip
    const now = Date.now()

    if (!requests.has(ip)) {
      requests.set(ip, [])
    }

    const userRequests = requests.get(ip).filter(time => now - time < windowMs)

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' })
    }

    userRequests.push(now)
    requests.set(ip, userRequests)

    next()
  }
}

module.exports = {
  requestLogger,
  authenticateToken,
  corsMiddleware,
  rateLimiter
}
