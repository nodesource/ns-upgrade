const { test, describe, beforeEach, afterEach, mock } = require('node:test')
const assert = require('node:assert')
const { PassThrough } = require('node:stream')
const {
  displayRawJSON,
  validateEmail,
  validateName,
  validateCompany,
  promptSubmit,
  collectUserInfo,
  submitReport,
  handleSubmission
} = require('../lib/submit')

const reportData = { schemaVersion: '1.0.0', projectInfo: { name: 'test-project' } }
const userInfo = { name: '', email: 'delivery@example.com', company: '' }

function silentLogger () {
  return { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
}

function jsonResponse (status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body
  }
}

function captureConsoleLog () {
  const lines = []
  mock.method(console, 'log', (...args) => { lines.push(args.join(' ')) })
  return lines
}

describe('Submit - Display Raw JSON', () => {
  test('displays JSON without errors', () => {
    const sampleData = {
      schemaVersion: '1.0.0',
      projectInfo: { name: 'test-project' }
    }

    assert.doesNotThrow(() => {
      displayRawJSON(sampleData)
    })
  })

  test('handles large JSON without truncation', () => {
    const largeData = {
      schemaVersion: '1.0.0',
      items: Array(100).fill({ test: 'data' })
    }

    assert.doesNotThrow(() => {
      displayRawJSON(largeData)
    })
  })

  test('handles empty object', () => {
    assert.doesNotThrow(() => {
      displayRawJSON({})
    })
  })
})

describe('Submit - Validation Functions', () => {
  test('validateEmail accepts valid emails', () => {
    assert.strictEqual(validateEmail('test@example.com'), true)
    assert.strictEqual(validateEmail('user.name@domain.co.uk'), true)
    assert.strictEqual(validateEmail('test+tag@example.com'), true)
  })

  test('validateEmail rejects invalid emails', () => {
    assert.strictEqual(typeof validateEmail(''), 'string')
    assert.strictEqual(typeof validateEmail('invalid'), 'string')
    assert.strictEqual(typeof validateEmail('@example.com'), 'string')
    assert.strictEqual(typeof validateEmail('test@'), 'string')
  })

  test('S8: validateName accepts empty values because the field is optional', () => {
    assert.strictEqual(validateName(''), true)
    assert.strictEqual(validateName(' '), true)
    assert.strictEqual(validateName('John Doe'), true)
    assert.strictEqual(validateName('Jane'), true)
  })

  test('S8: validateCompany accepts empty values because the field is optional', () => {
    assert.strictEqual(validateCompany(''), true)
    assert.strictEqual(validateCompany('   '), true)
    assert.strictEqual(validateCompany('ACME Corp'), true)
  })
})

describe('Submit - promptSubmit', () => {
  test('returns user choice when accepted', async () => {
    const mockInquirer = {
      prompt: async () => ({ submit: true })
    }
    const mockLoader = async () => mockInquirer

    const result = await promptSubmit(null, mockLoader)
    assert.strictEqual(result, true)
  })

  test('returns user choice when declined', async () => {
    const mockInquirer = {
      prompt: async () => ({ submit: false })
    }
    const mockLoader = async () => mockInquirer

    const result = await promptSubmit(null, mockLoader)
    assert.strictEqual(result, false)
  })

  test('handles inquirer with default export', async () => {
    const mockInquirer = {
      prompt: async () => ({ submit: true })
    }
    const mockLoader = async () => ({ default: mockInquirer })

    const result = await promptSubmit(null, mockLoader)
    assert.strictEqual(result, true)
  })
})

describe('Submit - collectUserInfo', () => {
  test('collects and returns user information', async () => {
    const mockInquirer = {
      prompt: async () => ({
        name: 'John Doe',
        email: 'john@example.com',
        company: 'ACME Corp'
      })
    }
    const mockLoader = async () => mockInquirer

    const result = await collectUserInfo(null, mockLoader)
    assert.deepStrictEqual(result, {
      name: 'John Doe',
      email: 'john@example.com',
      company: 'ACME Corp'
    })
  })

  test('trims whitespace from inputs', async () => {
    const mockInquirer = {
      prompt: async () => ({
        name: '  John Doe  ',
        email: '  john@example.com  ',
        company: '  ACME Corp  '
      })
    }
    const mockLoader = async () => mockInquirer

    const result = await collectUserInfo(null, mockLoader)
    assert.deepStrictEqual(result, {
      name: 'John Doe',
      email: 'john@example.com',
      company: 'ACME Corp'
    })
  })

  test('S8: accepts skipped optional fields', async () => {
    const mockInquirer = {
      prompt: async () => ({
        name: '',
        email: 'delivery@example.com',
        company: ''
      })
    }
    const mockLoader = async () => mockInquirer

    const result = await collectUserInfo(null, mockLoader)
    assert.deepStrictEqual(result, {
      name: '',
      email: 'delivery@example.com',
      company: ''
    })
  })
})

describe('Submit - submitReport', () => {
  beforeEach(() => {
    delete process.env.NODESOURCE_SUBMIT_URL
    delete process.env.NODESOURCE_ACCOUNTS_URL
  })

  afterEach(() => {
    mock.restoreAll()
    delete process.env.NODESOURCE_SUBMIT_URL
    delete process.env.NODESOURCE_ACCOUNTS_URL
  })

  test('S1/S13: sends the v2 header set with the bearer token and never the v1 marker', async () => {
    const calls = []
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url: String(url), headers: options.headers })
      return jsonResponse(200, { status: 'queued', message: 'Scan received' })
    })
    captureConsoleLog()

    await submitReport(reportData, userInfo, { token: 'tok-xyz', consoleId: 'org-1' }, silentLogger())

    assert.strictEqual(calls.length, 1)
    assert.strictEqual(calls[0].url, 'https://upgrade.nodesource.io')
    assert.deepStrictEqual(calls[0].headers, {
      'Content-Type': 'application/json',
      'User-Agent': 'nodesource-cli/upgrade',
      'x-client-source': 'nodesource-cli-v2',
      'x-upgrade-version': 'v2',
      'x-org-id': 'org-1',
      Authorization: 'Bearer tok-xyz'
    })
    assert.ok(!JSON.stringify(calls[0].headers).includes('nodesource-cli-v1'))
  })

  test('S2: the submit URL can be overridden for staging', async () => {
    process.env.NODESOURCE_SUBMIT_URL = 'https://submit.staging.example'
    const calls = []
    mock.method(globalThis, 'fetch', async (url) => {
      calls.push(String(url))
      return jsonResponse(200, { status: 'queued' })
    })
    captureConsoleLog()

    await submitReport(reportData, userInfo, { token: 'tok' }, silentLogger())
    assert.strictEqual(calls[0], 'https://submit.staging.example')
  })

  test('S3: a 401 triggers exactly one re-authentication and one resubmission with the new token', async () => {
    const calls = []
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push(options.headers)
      if (calls.length === 1) return jsonResponse(401, { message: 'Unauthorized' })
      return jsonResponse(200, { status: 'queued', message: 'Scan received' })
    })
    captureConsoleLog()
    const relogin = mock.fn(async () => ({ token: 'tok-new' }))

    const result = await submitReport(reportData, userInfo, { token: 'tok-old' }, silentLogger(), { relogin })

    assert.strictEqual(relogin.mock.callCount(), 1)
    assert.strictEqual(calls.length, 2)
    assert.strictEqual(calls[0].Authorization, 'Bearer tok-old')
    assert.strictEqual(calls[1].Authorization, 'Bearer tok-new')
    assert.strictEqual(result.status, 'queued')
  })

  test('S4: a second 401 fails the run with a clear error', async () => {
    const calls = []
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push(options.headers)
      return jsonResponse(401, { message: 'Unauthorized' })
    })
    captureConsoleLog()
    const relogin = mock.fn(async () => ({ token: 'tok-new' }))

    await assert.rejects(
      submitReport(reportData, userInfo, { token: 'tok-old' }, silentLogger(), { relogin }),
      /401/
    )
    assert.strictEqual(relogin.mock.callCount(), 1)
    assert.strictEqual(calls.length, 2)
  })

  test('S5: other failures do not trigger re-authentication', async () => {
    mock.method(globalThis, 'fetch', async () => jsonResponse(500, { message: 'boom' }))
    captureConsoleLog()
    const relogin = mock.fn(async () => ({ token: 'tok-new' }))

    await assert.rejects(
      submitReport(reportData, userInfo, { token: 'tok' }, silentLogger(), { relogin }),
      /500/
    )
    assert.strictEqual(relogin.mock.callCount(), 0)
  })

  test('S6: success output carries the queued status and the accounts-ui reports URL', async () => {
    mock.method(globalThis, 'fetch', async () => jsonResponse(200, { status: 'queued', message: 'Scan received' }))
    const lines = captureConsoleLog()

    await submitReport(reportData, userInfo, { token: 'tok' }, silentLogger())

    const output = lines.join('\n')
    assert.match(output, /queued/i)
    assert.match(output, /https:\/\/accounts\.nodesource\.com\/reports/)
  })

  test('S6: the reports URL follows the accounts URL override', async () => {
    process.env.NODESOURCE_ACCOUNTS_URL = 'https://staging.accounts.nodesource.com'
    mock.method(globalThis, 'fetch', async () => jsonResponse(200, { status: 'queued' }))
    const lines = captureConsoleLog()

    await submitReport(reportData, userInfo, { token: 'tok' }, silentLogger())
    assert.match(lines.join('\n'), /https:\/\/staging\.accounts\.nodesource\.com\/reports/)
  })

  test('S7: never logs the organization token', async () => {
    mock.method(globalThis, 'fetch', async () => jsonResponse(200, { status: 'queued' }))
    const lines = captureConsoleLog()
    const logger = { info: mock.fn(), warn: mock.fn(), error: mock.fn(), debug: mock.fn() }

    await submitReport(reportData, userInfo, { token: 'tok-secret-9' }, logger)

    const logged = JSON.stringify([
      ...logger.info.mock.calls,
      ...logger.warn.mock.calls,
      ...logger.error.mock.calls,
      ...logger.debug.mock.calls
    ])
    assert.ok(!logged.includes('tok-secret-9'), 'token must not be logged')
    assert.ok(!lines.join('\n').includes('tok-secret-9'), 'token must not be printed')
  })
})

describe('Submit - handleSubmission', () => {
  let originalStdin

  beforeEach(() => {
    originalStdin = process.stdin
    const fakeStdin = new PassThrough()
    fakeStdin.end()
    process.stdin = fakeStdin
  })

  afterEach(() => {
    process.stdin = originalStdin
    mock.restoreAll()
  })

  test('S9/S12: runs prompt, user info, login and submit in order and reports success', { timeout: 5000 }, async () => {
    const order = []
    const deps = {
      displayRawJSON: () => {},
      promptSubmit: async () => { order.push('prompt'); return true },
      collectUserInfo: async () => { order.push('info'); return userInfo },
      login: async () => { order.push('login'); return { token: 'tok' } },
      submitReport: async () => { order.push('submit'); return { status: 'queued' } }
    }

    const result = await handleSubmission(reportData, '/tmp/report.json', silentLogger(), deps)

    assert.strictEqual(result, true)
    assert.deepStrictEqual(order, ['prompt', 'info', 'login', 'submit'])
  })

  test('S10: a declined submit never starts the login flow', { timeout: 5000 }, async () => {
    let loginCalled = false
    const deps = {
      displayRawJSON: () => {},
      promptSubmit: async () => false,
      collectUserInfo: async () => { throw new Error('must not be called') },
      login: async () => { loginCalled = true; return { token: 'tok' } },
      submitReport: async () => { throw new Error('must not be called') }
    }
    captureConsoleLog()

    const result = await handleSubmission(reportData, '/tmp/report.json', silentLogger(), deps)

    assert.strictEqual(result, false)
    assert.strictEqual(loginCalled, false)
  })

  test('S11: a failed login never submits', { timeout: 5000 }, async () => {
    let submitCalled = false
    const deps = {
      displayRawJSON: () => {},
      promptSubmit: async () => true,
      collectUserInfo: async () => userInfo,
      login: async () => {
        const err = new Error('Authentication timed out')
        err.reason = 'timeout'
        throw err
      },
      submitReport: async () => { submitCalled = true }
    }
    captureConsoleLog()

    const result = await handleSubmission(reportData, '/tmp/report.json', silentLogger(), deps)

    assert.strictEqual(result, false)
    assert.strictEqual(submitCalled, false)
  })
})
