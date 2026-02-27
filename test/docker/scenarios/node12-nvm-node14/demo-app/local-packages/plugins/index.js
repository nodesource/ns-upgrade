/**
 * Local Hapi.js plugin for demonstrating file: dependencies
 */

const localLogger = {
  name: 'local-logger',
  version: '1.0.0',
  register: async function (server, options) {
    // Add request logging
    server.ext('onRequest', (request, h) => {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] ${request.method.toUpperCase()} ${request.path}`)
      return h.continue
    })

    // Add response time logging
    server.ext('onPreResponse', (request, h) => {
      const response = request.response
      if (response.isBoom) {
        console.log(`[ERROR] ${response.output.statusCode} - ${response.message}`)
      }
      return h.continue
    })

    console.log(' Local logger plugin registered')
  }
}

module.exports = localLogger
