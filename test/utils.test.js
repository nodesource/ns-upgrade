const { test, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const {
  validatePackageJson,
  truncateIfNeeded,
  validateOutputDirectory,
  fileExists,
  readFileIfExists,
  writeFile
} = require('../lib/utils')

describe('Utils - Package.json Validation', () => {
  test('reads valid package.json', () => {
    const originalCwd = process.cwd()
    try {
      // Should read package.json from current project
      const pkg = validatePackageJson()
      assert.ok(pkg, 'Should return package.json content')
      assert.strictEqual(pkg.name, '@nodesource/upgrade', 'Should have correct package name')
    } finally {
      process.chdir(originalCwd)
    }
  })

  test('throws when no package.json found', () => {
    const originalCwd = process.cwd()
    try {
      // Change to a directory without package.json
      process.chdir('/tmp')
      assert.throws(
        () => validatePackageJson(),
        /No package.json found/,
        'Should throw when package.json not found'
      )
    } finally {
      process.chdir(originalCwd)
    }
  })

  test('provides detailed error messages', () => {
    const utilsPath = require.resolve('../lib/utils')
    const content = fs.readFileSync(utilsPath, 'utf-8')

    assert.ok(content.includes('Cannot read package.json:'), 'Should provide detailed read error')
    assert.ok(content.includes('package.json contains invalid JSON syntax'), 'Should distinguish JSON syntax errors')
    assert.ok(content.includes('Failed to read package.json:'), 'Should provide general read error')
  })

  test('handles syntax errors specifically', () => {
    const utilsPath = require.resolve('../lib/utils')
    const content = fs.readFileSync(utilsPath, 'utf-8')

    assert.ok(content.includes('error instanceof SyntaxError'), 'Should check for SyntaxError')
    assert.ok(content.includes('Please check the file formatting'), 'Should provide formatting hint')
  })
})

describe('Utils - Output Directory Validation', () => {
  test('provides detailed error messages', () => {
    const utilsPath = require.resolve('../lib/utils')
    const content = fs.readFileSync(utilsPath, 'utf-8')

    assert.ok(content.includes('Output directory does not exist:'), 'Should include directory path in error')
    assert.ok(content.includes('Cannot write to output directory:'), 'Should provide detailed write error')
  })

  test('validates directory correctly', () => {
    const validPath = path.join(process.cwd(), 'test-output.json')
    assert.doesNotThrow(
      () => validateOutputDirectory(validPath),
      'Should not throw for valid directory'
    )
  })

  test('throws for non-existent directory', () => {
    const invalidPath = '/non/existent/path/output.json'
    assert.throws(
      () => validateOutputDirectory(invalidPath),
      /Output directory does not exist/,
      'Should throw for non-existent directory'
    )
  })
})

describe('Utils - Content Truncation', () => {
  test('truncateIfNeeded returns content when under limit', () => {
    const content = 'small content'
    const result = truncateIfNeeded(content, 1024)
    assert.strictEqual(result.content, content, 'Content should not be truncated')
    assert.strictEqual(result.isTruncated, false, 'Should not be marked as truncated')
    assert.strictEqual(result.warning, null, 'Should have no warning')
  })

  test('truncateIfNeeded truncates content when over limit', () => {
    const content = 'a'.repeat(2000)
    const limit = 1000
    const result = truncateIfNeeded(content, limit)
    assert.strictEqual(result.content.length, limit, 'Content should be truncated to limit')
    assert.strictEqual(result.isTruncated, true, 'Should be marked as truncated')
    assert.ok(result.warning.includes('truncated'), 'Should have truncation warning')
  })
})

describe('Utils - File Operations', () => {
  test('fileExists returns true for existing file', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    assert.strictEqual(fileExists(packageJsonPath), true, 'Should return true for existing file')
  })

  test('fileExists returns false for non-existent file', () => {
    const nonExistentPath = '/tmp/non-existent-file-' + Date.now() + '.txt'
    assert.strictEqual(fileExists(nonExistentPath), false, 'Should return false for non-existent file')
  })

  test('readFileIfExists reads existing file', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const content = readFileIfExists(packageJsonPath)
    assert.ok(content, 'Should return content for existing file')
    assert.ok(content.includes('@nodesource/upgrade'), 'Should contain package name')
  })

  test('readFileIfExists returns null for non-existent file', () => {
    const nonExistentPath = '/tmp/non-existent-file-' + Date.now() + '.txt'
    const content = readFileIfExists(nonExistentPath)
    assert.strictEqual(content, null, 'Should return null for non-existent file')
  })

  test('writeFile writes content to file', () => {
    const tempFile = path.join('/tmp', 'test-write-' + Date.now() + '.txt')
    const testContent = 'test content'

    try {
      writeFile(tempFile, testContent)
      assert.ok(fs.existsSync(tempFile), 'File should be created')
      const content = fs.readFileSync(tempFile, 'utf-8')
      assert.strictEqual(content, testContent, 'Content should match')
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    }
  })

  test('writeFile throws for invalid path', () => {
    const invalidPath = '/root/invalid-permission-' + Date.now() + '.txt'
    assert.throws(
      () => writeFile(invalidPath, 'content'),
      /Cannot write to/,
      'Should throw for invalid path'
    )
  })

  test('provides detailed error messages', () => {
    const utilsPath = require.resolve('../lib/utils')
    const content = fs.readFileSync(utilsPath, 'utf-8')

    assert.ok(content.includes('Cannot write to'), 'Should include file path in error')
    assert.ok(content.includes(': $' + '{error.message}'), 'Should include specific error message')
  })
})
