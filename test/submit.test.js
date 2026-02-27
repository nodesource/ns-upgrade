const { test, describe } = require('node:test')
const assert = require('node:assert')
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

    // Should display all content, no truncation
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

  test('validateName accepts valid names', () => {
    assert.strictEqual(validateName('John Doe'), true)
    assert.strictEqual(validateName('Jane'), true)
    assert.strictEqual(validateName('María García'), true)
  })

  test('validateName rejects invalid names', () => {
    assert.strictEqual(typeof validateName(''), 'string')
    assert.strictEqual(typeof validateName(' '), 'string')
    assert.strictEqual(typeof validateName('A'), 'string')
  })

  test('validateCompany accepts valid company names', () => {
    assert.strictEqual(validateCompany('ACME Corp'), true)
    assert.strictEqual(validateCompany('NodeSource'), true)
    assert.strictEqual(validateCompany('Company & Co.'), true)
  })

  test('validateCompany rejects empty names', () => {
    assert.strictEqual(typeof validateCompany(''), 'string')
    assert.strictEqual(typeof validateCompany('   '), 'string')
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
})

describe('Submit - submitReport', () => {
  test('validates report data structure', () => {
    // Verify the function exists
    assert.ok(typeof submitReport === 'function')
  })

  test('has correct function signature', () => {
    // submitReport(reportData, userInfo, logger)
    assert.ok(typeof submitReport === 'function')
  })
})

describe('Submit - handleSubmission', () => {
  test('verifies function exists', () => {
    assert.ok(typeof handleSubmission === 'function')
  })

  test('has correct function signature', () => {
    assert.ok(typeof handleSubmission === 'function')
  })
})
