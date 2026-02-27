const Hapi = require('@hapi/hapi')
const Joi = require('@hapi/joi')
const Boom = require('@hapi/boom')
const _ = require('lodash')
const moment = require('moment')
const { v4: uuidv4 } = require('uuid')
const localPlugins = require('local-plugins')

// In-memory data store
const users = []
const posts = []

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: '0.0.0.0'
  })

  // Register local plugin
  await server.register(localPlugins)

  // Routes
  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
      return {
        app: 'Demo Hapi.js REST API',
        version: '1.0.0',
        nodeVersion: process.version,
        hapiVersion: server.version,
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        features: ['Hapi.js', 'Joi validation', 'Local plugins', 'In-memory storage']
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/health',
    handler: (request, h) => {
      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: moment().toISOString()
      }
    }
  })

  // User routes
  server.route({
    method: 'POST',
    path: '/users',
    options: {
      validate: {
        payload: Joi.object({
          name: Joi.string().min(2).required(),
          email: Joi.string().email().required(),
          age: Joi.number().min(0).optional()
        })
      }
    },
    handler: (request, h) => {
      const user = {
        id: uuidv4(),
        ...request.payload,
        createdAt: moment().toISOString()
      }
      users.push(user)
      return h.response(user).code(201)
    }
  })

  server.route({
    method: 'GET',
    path: '/users',
    handler: (request, h) => {
      return {
        total: users.length,
        users
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/users/{id}',
    handler: (request, h) => {
      const user = _.find(users, { id: request.params.id })
      if (!user) {
        throw Boom.notFound('User not found')
      }
      return user
    }
  })

  // Post routes
  server.route({
    method: 'POST',
    path: '/posts',
    options: {
      validate: {
        payload: Joi.object({
          title: Joi.string().min(3).required(),
          content: Joi.string().required(),
          userId: Joi.string().required()
        })
      }
    },
    handler: (request, h) => {
      const user = _.find(users, { id: request.payload.userId })
      if (!user) {
        throw Boom.badRequest('User not found')
      }

      const post = {
        id: uuidv4(),
        ...request.payload,
        createdAt: moment().toISOString()
      }
      posts.push(post)
      return h.response(post).code(201)
    }
  })

  server.route({
    method: 'GET',
    path: '/posts',
    handler: (request, h) => {
      return {
        total: posts.length,
        posts
      }
    }
  })

  await server.start()
  console.log('=== Hapi.js REST API Server ===')
  console.log(`Server running at: ${server.info.uri}`)
  console.log(`Node.js version: ${process.version}`)
  console.log(`Hapi version: ${server.version}`)
  console.log(`Local plugin loaded: ${server.plugins['local-logger'] ? 'Yes' : 'No'}`)
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

init()

module.exports = { init }
