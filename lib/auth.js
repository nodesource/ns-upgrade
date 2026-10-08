const http = require('node:http')
const net = require('node:net')
const { spawn } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const { ACCOUNTS_URL } = require('./constants')

const DEFAULT_PORT_RANGE = [8765, 8770]
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000

function authError (reason, message) {
  const error = new Error(message)
  error.reason = reason
  return error
}

function buildSignInUrl (accountsUrl, port, state) {
  const url = new URL('/sign-in', accountsUrl)
  url.searchParams.set('extension', 'nsolid-plugin')
  url.searchParams.set('port', String(port))
  url.searchParams.set('state', state)
  return url.toString()
}

function isPortAvailable (port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
    tester.once('error', () => resolve(false))
    tester.listen(port, '127.0.0.1', () => {
      tester.close(() => resolve(true))
    })
  })
}

async function findAvailablePort (startPort, maxPort) {
  for (let port = startPort; port <= maxPort; port++) {
    if (await isPortAvailable(port)) return port
  }
  return null
}

function renderPage (title, message) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title></head>
<body><h1>${title}</h1><p>${message}</p></body>
</html>`
}

function defaultBrowserLauncher (url) {
  return new Promise((resolve) => {
    const platform = process.platform
    const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
    const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]
    try {
      const child = spawn(command, args, { stdio: 'ignore', detached: true })
      child.on('error', () => resolve())
      child.unref()
    } catch {
      // best effort: the sign-in URL is always printed to stderr
    }
    resolve()
  })
}

async function login (options = {}) {
  const accountsUrl = options.accountsUrl || process.env.NODESOURCE_ACCOUNTS_URL || ACCOUNTS_URL
  const [minPort, maxPort] = options.portRange || DEFAULT_PORT_RANGE
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS
  const stderr = options.stderr || ((text) => process.stderr.write(text))
  const browserLauncher = options.browserLauncher || defaultBrowserLauncher

  const state = randomUUID()

  let settled = false
  let timeoutId = null
  let resolveCallback = null
  let rejectCallback = null
  const callbackPromise = new Promise((resolve, reject) => {
    resolveCallback = resolve
    rejectCallback = reject
  })

  const respond = (res, status, title, message) => {
    res.writeHead(status, {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      Connection: 'close'
    })
    res.end(renderPage(title, message))
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    if (url.pathname !== '/callback') {
      respond(res, 404, 'Not found', 'Unknown callback path.')
      return
    }

    const receivedState = url.searchParams.get('state')
    if (receivedState !== state) {
      respond(res, 400, 'Authentication failed', 'Invalid state parameter.')
      return
    }

    const success = url.searchParams.get('success') === 'true'
    const token = url.searchParams.get('token')
    const consoleId = url.searchParams.get('consoleId')
    const saasToken = url.searchParams.get('NSOLID_SAAS')
    const consoleUrl = url.searchParams.get('url')

    if (!success || !token || !consoleId || !saasToken || !consoleUrl) {
      respond(res, 400, 'Authentication failed', 'Authentication was not successful.')
      if (!settled) {
        settled = true
        clearTimeout(timeoutId)
        rejectCallback(authError('auth-failed', 'Authentication failed'))
      }
      return
    }

    respond(res, 200, 'Authentication successful', 'You can close this window.')
    if (!settled) {
      settled = true
      clearTimeout(timeoutId)
      resolveCallback({ token, consoleId, saasToken, consoleUrl })
    }
  })

  let port = await findAvailablePort(minPort, maxPort)
  while (port !== null) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => reject(error)
        server.once('error', onError)
        server.listen(port, '127.0.0.1', () => {
          server.removeListener('error', onError)
          resolve()
        })
      })
      break
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error
      port = await findAvailablePort(port + 1, maxPort)
    }
  }

  if (port === null) {
    throw authError('no-ports', `No available ports in range ${minPort}-${maxPort}`)
  }

  const signInUrl = buildSignInUrl(accountsUrl, port, state)
  stderr('\nNodeSource authentication started.\n')
  stderr('If a browser did not open automatically, open this sign-in URL manually:\n')
  stderr(`${signInUrl}\n\n`)

  try {
    await browserLauncher(signInUrl)
  } catch {
    // best effort: the sign-in URL is already on stderr
  }

  timeoutId = setTimeout(() => {
    if (!settled) {
      settled = true
      rejectCallback(authError('timeout', 'Authentication timed out'))
    }
  }, timeoutMs)

  try {
    return await callbackPromise
  } finally {
    clearTimeout(timeoutId)
    await new Promise((resolve) => {
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections()
      server.close(() => resolve())
    })
  }
}

module.exports = { buildSignInUrl, login }
