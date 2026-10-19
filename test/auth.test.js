const { test, describe } = require('node:test')
const assert = require('node:assert')
const net = require('node:net')
const fs = require('node:fs')
const { mock } = require('node:test')

const { buildSignInUrl, login } = require('../lib/auth')

const MIN_PORT = 8765
const MAX_PORT = 8770

function silentLogger () {
  return { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
}

function getFreePort () {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

function occupyPort (port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') resolve(null)
      else reject(err)
    })
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

function closeServer (server) {
  return new Promise((resolve) => {
    if (!server) return resolve()
    server.close(() => resolve())
  })
}

function isPortFree (port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)))
  })
}

function waitFor (check, timeoutMs = 3000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      const value = check()
      if (value) return resolve(value)
      if (Date.now() - started > timeoutMs) return reject(new Error('waitFor timed out'))
      setTimeout(tick, 10)
    }
    tick()
  })
}

function startLogin (overrides = {}) {
  const stderrChunks = []
  const launched = []
  const options = {
    accountsUrl: 'https://accounts.example',
    timeoutMs: 3000,
    browserLauncher: async (url) => { launched.push(url) },
    stderr: (text) => { stderrChunks.push(text) },
    logger: silentLogger(),
    ...overrides
  }

  const promise = login(options)
  promise.catch(() => {})

  const ready = waitFor(() => {
    const text = stderrChunks.join('')
    const match = text.match(/\/sign-in\?extension=nsolid-plugin&port=(\d+)&state=([^&\s]+)/)
    return match ? { port: Number(match[1]), state: match[2] } : null
  })

  return { promise, launched, stderrChunks, ready }
}

function callback (port, params) {
  const query = new URLSearchParams(params).toString()
  return fetch(`http://127.0.0.1:${port}/callback?${query}`)
}

async function finishLogin (flow, port, params) {
  const res = await callback(port, params)
  const session = await flow.promise
  return { res, session }
}

describe('auth - buildSignInUrl', () => {
  test('A1: builds the exact sign-in URL for the loopback contract', () => {
    assert.strictEqual(
      buildSignInUrl('https://accounts.nodesource.com', 8765, 'fixed-state'),
      'https://accounts.nodesource.com/sign-in?extension=nsolid-plugin&port=8765&state=fixed-state'
    )
  })

  test('A1: replaces any base path like the plugin contract does', () => {
    assert.strictEqual(
      buildSignInUrl('https://accounts.example/some/path', 8766, 's1'),
      'https://accounts.example/sign-in?extension=nsolid-plugin&port=8766&state=s1'
    )
  })
})

describe('auth - loopback login', () => {
  test('A2: each login generates a distinct state', async () => {
    const portA = await getFreePort()
    const portB = await getFreePort()
    const flowA = startLogin({ portRange: [portA, portA] })
    const flowB = startLogin({ portRange: [portB, portB] })

    const readyA = await flowA.ready
    const readyB = await flowB.ready
    assert.notStrictEqual(readyA.state, readyB.state)

    const valid = { success: 'true', token: 'tok', consoleId: 'org-1', NSOLID_SAAS: 'saas', url: 'https://nsolid.example' }
    await callback(portA, { ...valid, state: readyA.state })
    await callback(portB, { ...valid, state: readyB.state })
    await flowA.promise
    await flowB.promise
  })

  test('A3: a valid callback resolves the session and closes the server', async () => {
    const port = await getFreePort()
    const flow = startLogin({ portRange: [port, port] })
    const { state } = await flow.ready

    const { res, session } = await finishLogin(flow, port, {
      success: 'true',
      token: 'tok-123',
      consoleId: 'org-1',
      NSOLID_SAAS: 'saas-1',
      url: 'https://nsolid.example',
      state
    })

    assert.strictEqual(res.status, 200)
    assert.match(res.headers.get('content-type'), /text\/html/)
    assert.ok(res.headers.get('content-security-policy'))
    const page = await res.text()
    assert.match(page, /Authentication successful/)
    assert.ok(page.includes('<svg'), 'branded page should inline the logo svg')
    assert.ok(page.includes('https://nodesource.com/icon.ico'), 'favicon link should be present')
    const externalRefs = page.match(/https?:\/\/[^"' )]+/g) || []
    const allowedExternalRefs = new Set(['https://nodesource.com/icon.ico', 'http://www.w3.org/2000/svg'])
    for (const ref of externalRefs) {
      assert.ok(allowedExternalRefs.has(ref), `unexpected external reference in the page: ${ref}`)
    }

    assert.deepStrictEqual(session, {
      token: 'tok-123',
      consoleId: 'org-1',
      saasToken: 'saas-1',
      consoleUrl: 'https://nsolid.example'
    })

    assert.strictEqual(flow.launched.length, 1)
    assert.match(flow.launched[0], new RegExp(`port=${port}`))
    assert.ok(await isPortFree(port), 'callback server should be closed')
  })

  test('A4: a mismatched state is rejected and the login keeps waiting', async () => {
    const port = await getFreePort()
    const flow = startLogin({ portRange: [port, port] })
    const { state } = await flow.ready

    const bad = await callback(port, {
      success: 'true',
      token: 'tok',
      consoleId: 'org-1',
      NSOLID_SAAS: 'saas',
      url: 'https://nsolid.example',
      state: 'wrong-state'
    })
    assert.strictEqual(bad.status, 400)
    assert.match(await bad.text(), /Authentication failed/)

    const good = await callback(port, {
      success: 'true',
      token: 'tok',
      consoleId: 'org-1',
      NSOLID_SAAS: 'saas',
      url: 'https://nsolid.example',
      state
    })
    assert.strictEqual(good.status, 200)
    const session = await flow.promise
    assert.strictEqual(session.token, 'tok')
  })

  test('A5: a failed login rejects with reason auth-failed', async () => {
    const port = await getFreePort()
    const flow = startLogin({ portRange: [port, port] })
    const { state } = await flow.ready

    const res = await callback(port, { success: 'false', state })
    assert.strictEqual(res.status, 400)

    await assert.rejects(flow.promise, (err) => err.reason === 'auth-failed')
    assert.ok(await isPortFree(port), 'callback server should be closed')
  })

  test('A6: a success callback with missing params rejects with auth-failed', async () => {
    const port = await getFreePort()
    const flow = startLogin({ portRange: [port, port] })
    const { state } = await flow.ready

    const res = await callback(port, { success: 'true', token: 'tok', state })
    assert.strictEqual(res.status, 400)

    await assert.rejects(flow.promise, (err) => err.reason === 'auth-failed')
  })

  test('A7: no callback within the timeout rejects with reason timeout', async () => {
    const port = await getFreePort()
    const flow = startLogin({ portRange: [port, port], timeoutMs: 100 })
    await flow.ready

    await assert.rejects(flow.promise, (err) => err.reason === 'timeout')
    assert.ok(await isPortFree(port), 'callback server should be closed')
  })

  test('A8: an occupied port is skipped for the next free one', async () => {
    const occupied = [await occupyPort(MIN_PORT), await occupyPort(MIN_PORT + 1)]
    try {
      const flow = startLogin({})
      const { port, state } = await flow.ready

      assert.strictEqual(port, MIN_PORT + 2)

      await callback(port, {
        success: 'true',
        token: 'tok',
        consoleId: 'org-1',
        NSOLID_SAAS: 'saas',
        url: 'https://nsolid.example',
        state
      })
      await flow.promise
    } finally {
      await closeServer(occupied[0])
      await closeServer(occupied[1])
    }
  })

  test('A9: an exhausted port range fails fast without silent retry', async () => {
    const occupied = []
    try {
      for (let port = MIN_PORT; port <= MAX_PORT; port++) {
        occupied.push(await occupyPort(port))
      }

      await assert.rejects(
        login({
          accountsUrl: 'https://accounts.example',
          timeoutMs: 200,
          browserLauncher: async () => {},
          stderr: () => {},
          logger: silentLogger()
        }),
        (err) => err.reason === 'no-ports'
      )
    } finally {
      for (const server of occupied) {
        await closeServer(server)
      }
    }
  })

  test('A10: a browser that cannot open still leaves the login waiting with the URL on stderr', async () => {
    const port = await getFreePort()
    const flow = startLogin({
      portRange: [port, port],
      browserLauncher: async () => { throw new Error('no browser available') }
    })
    const { state } = await flow.ready

    assert.match(flow.stderrChunks.join(''), /sign-in\?extension=nsolid-plugin/)

    await callback(port, {
      success: 'true',
      token: 'tok',
      consoleId: 'org-1',
      NSOLID_SAAS: 'saas',
      url: 'https://nsolid.example',
      state
    })
    const session = await flow.promise
    assert.strictEqual(session.token, 'tok')
  })

  test('A11: no credentials at rest and no secrets in logs', async () => {
    const envBefore = { ...process.env }
    const filesBefore = fs.readdirSync(process.cwd())
    const logger = { info: mock.fn(), warn: mock.fn(), error: mock.fn(), debug: mock.fn() }

    const port = await getFreePort()
    const flow = startLogin({ portRange: [port, port], logger })
    const { state } = await flow.ready

    await callback(port, {
      success: 'true',
      token: 'tok-secret-1',
      consoleId: 'org-1',
      NSOLID_SAAS: 'saas-secret-1',
      url: 'https://nsolid.example',
      state
    })
    await flow.promise

    assert.deepStrictEqual({ ...process.env }, envBefore)
    assert.deepStrictEqual(fs.readdirSync(process.cwd()), filesBefore)

    const logged = JSON.stringify([
      ...logger.info.mock.calls,
      ...logger.warn.mock.calls,
      ...logger.error.mock.calls,
      ...logger.debug.mock.calls
    ])
    assert.ok(!logged.includes('tok-secret-1'), 'token must not be logged')
    assert.ok(!logged.includes('saas-secret-1'), 'saas token must not be logged')
  })
})
