const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  validateCustomNodeVersion,
  validateCustomOS,
  validateAdditionalNotes,
  validateOSSelection,
  extractMajorVersion
} = require('../lib/validators')

describe('Validators - validateCustomNodeVersion', () => {
  test('accepts valid version numbers', () => {
    assert.strictEqual(validateCustomNodeVersion('21'), true)
    assert.strictEqual(validateCustomNodeVersion('23'), true)
    assert.strictEqual(validateCustomNodeVersion('21.5.0'), true)
    assert.strictEqual(validateCustomNodeVersion('v21'), true)
    assert.strictEqual(validateCustomNodeVersion('v23.1.0'), true)
  })

  test('rejects empty input', () => {
    assert.strictEqual(validateCustomNodeVersion(''), 'Please provide a version number.')
    assert.strictEqual(validateCustomNodeVersion('   '), 'Please provide a version number.')
  })

  test('rejects invalid version formats', () => {
    assert.strictEqual(validateCustomNodeVersion('abc'), 'Please provide a valid version number (e.g., 21, 23, 21.5.0).')
    assert.strictEqual(validateCustomNodeVersion('21.x'), 'Please provide a valid version number (e.g., 21, 23, 21.5.0).')
    assert.strictEqual(validateCustomNodeVersion('latest'), 'Please provide a valid version number (e.g., 21, 23, 21.5.0).')
  })
})

describe('Validators - validateCustomOS', () => {
  test('accepts valid OS input', () => {
    assert.strictEqual(validateCustomOS('Custom Linux'), true)
    assert.strictEqual(validateCustomOS('Windows Server'), true)
    assert.strictEqual(validateCustomOS('FreeBSD'), true)
  })

  test('rejects empty input', () => {
    assert.strictEqual(validateCustomOS(''), 'Please provide a value.')
    assert.strictEqual(validateCustomOS('   '), 'Please provide a value.')
  })
})

describe('Validators - validateAdditionalNotes', () => {
  test('accepts notes within limit', () => {
    assert.strictEqual(validateAdditionalNotes('Short note'), true)
    assert.strictEqual(validateAdditionalNotes(''.padEnd(500, 'a')), true)
  })

  test('rejects notes over limit', () => {
    const longNote = ''.padEnd(501, 'a')
    assert.strictEqual(validateAdditionalNotes(longNote), 'Please keep your notes to 500 characters or less.')
  })
})

describe('Validators - validateOSSelection', () => {
  test('accepts non-empty selection', () => {
    assert.strictEqual(validateOSSelection(['Ubuntu Linux']), true)
    assert.strictEqual(validateOSSelection(['macOS', 'Windows']), true)
  })

  test('rejects empty selection', () => {
    assert.strictEqual(validateOSSelection([]), 'Please select at least one option.')
  })
})

describe('Validators - extractMajorVersion', () => {
  test('extracts major version from standard format', () => {
    assert.strictEqual(extractMajorVersion('v20.10.0'), '20')
    assert.strictEqual(extractMajorVersion('v18.17.1'), '18')
    assert.strictEqual(extractMajorVersion('v16.20.2'), '16')
  })

  test('extracts major version without v prefix', () => {
    assert.strictEqual(extractMajorVersion('20.10.0'), '20')
    assert.strictEqual(extractMajorVersion('18.17.1'), '18')
    assert.strictEqual(extractMajorVersion('16.20.2'), '16')
  })

  test('handles major version only', () => {
    assert.strictEqual(extractMajorVersion('v20'), '20')
    assert.strictEqual(extractMajorVersion('18'), '18')
  })

  test('returns null for invalid input', () => {
    assert.strictEqual(extractMajorVersion(null), null)
    assert.strictEqual(extractMajorVersion(undefined), null)
    assert.strictEqual(extractMajorVersion(''), null)
    assert.strictEqual(extractMajorVersion('invalid'), null)
    assert.strictEqual(extractMajorVersion('not.a.version'), null)
  })
})
