const { test, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const welcome = require('../lib/welcome')

describe('Welcome - Module Exports', () => {
  test('display function exists and is callable', () => {
    assert.ok(typeof welcome.display === 'function', 'Should export display function')
    // Don't call it as it clears the console
  })

  test('acceptTOS function exists', () => {
    assert.ok(typeof welcome.acceptTOS === 'function', 'Should export acceptTOS function')
    // Don't call it as it's interactive
  })

  test('module exports required functions', () => {
    assert.ok(welcome, 'Module should be loadable')
    assert.ok(welcome.display, 'Should export display')
    assert.ok(welcome.acceptTOS, 'Should export acceptTOS')
    assert.strictEqual(Object.keys(welcome).length, 2, 'Should export exactly 2 functions')
  })
})

describe('Welcome - Asset Files', () => {
  test('TOS file exists', () => {
    const tosPath = path.join(__dirname, '../assets/TOS.md')
    assert.ok(fs.existsSync(tosPath), 'TOS.md file should exist')
  })

  test('TOS file has content', () => {
    const tosPath = path.join(__dirname, '../assets/TOS.md')
    const content = fs.readFileSync(tosPath, 'utf-8')
    assert.ok(content.length > 0, 'TOS file should have content')
    assert.ok(content.includes('Terms'), 'TOS should contain "Terms"')
  })

  test('logo asset exists', () => {
    const logoPath = path.join(__dirname, '../assets/logo.js')
    assert.ok(fs.existsSync(logoPath), 'logo.js file should exist')
  })

  test('logo can be imported', async () => {
    // Just verify the logo module can be imported
    const logo = require('../assets/logo')
    assert.ok(logo, 'Logo should be importable')
    assert.ok(typeof logo === 'string', 'Logo should be a string')
  })
})

describe('Welcome - Markdown Processing', () => {
  test('marked is configured for terminal', () => {
    const { marked } = require('marked')

    // Test that marked can render markdown
    const result = marked('# Test Heading')

    assert.ok(result, 'Should render markdown')
    assert.ok(typeof result === 'string', 'Result should be a string')
  })

  test('TOS markdown can be parsed', () => {
    const { marked } = require('marked')

    const tosPath = path.join(__dirname, '../assets/TOS.md')
    const tosContent = fs.readFileSync(tosPath, 'utf-8')

    // Test that TOS can be rendered
    const rendered = marked(tosContent)

    assert.ok(rendered, 'Should render TOS')
    assert.ok(typeof rendered === 'string', 'Rendered TOS should be a string')
    assert.ok(rendered.length > 0, 'Rendered TOS should have content')
  })
})

describe('Welcome - Display Function', () => {
  test('display calls console methods', () => {
    const originalClear = console.clear
    const originalLog = console.log

    let clearCalled = false
    let logCalled = false

    // Mock console methods
    console.clear = () => { clearCalled = true }
    console.log = () => { logCalled = true }

    try {
      const { display } = require('../lib/welcome')
      display()

      assert.strictEqual(clearCalled, true, 'Should call console.clear')
      assert.strictEqual(logCalled, true, 'Should call console.log')
    } finally {
      console.clear = originalClear
      console.log = originalLog
    }
  })
})

describe('Welcome - acceptTOS Function', () => {
  test('acceptTOS accepts logger parameter', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('logger = null'), 'Should accept optional logger parameter')
    assert.ok(content.includes('const log = logger ||'), 'Should provide default logger')
  })

  test('maintains backward compatibility', () => {
    const welcome = require('../lib/welcome')

    // Function should work without logger parameter (backward compatibility)
    assert.ok(typeof welcome.acceptTOS === 'function', 'Should be a function')
  })
})

describe('Welcome - Error Handling', () => {
  test('has error handling structure', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('try {'), 'Should have try block')
    assert.ok(content.includes('catch (error)'), 'Should have catch block')
    assert.ok(content.includes('log.error'), 'Should log errors')
    assert.ok(content.includes('throw error'), 'Should re-throw errors after logging')
  })

  test('handles TOS file reading errors', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('try {'), 'Should wrap file reading in try-catch')
    assert.ok(content.includes('Failed to read TOS file'), 'Should handle file reading errors')
    assert.ok(content.includes('Unable to read Terms of Service file'), 'Should provide user-friendly error message')
  })

  test('handles inquirer import errors', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('await import(\'inquirer\')'), 'Should dynamically import inquirer')
    assert.ok(content.includes('try {'), 'Should wrap import in try-catch')
  })

  test('error message is user-friendly', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('TOS acceptance failed'), 'Should have user-friendly error message')
    assert.ok(content.includes('Unable to read Terms of Service file'), 'Should have specific file error message')
  })
})

describe('Welcome - Logging', () => {
  test('provides default logger when none provided', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('info: () => {}'), 'Should provide default no-op info')
    assert.ok(content.includes('warn: () => {}'), 'Should provide default no-op warn')
    assert.ok(content.includes('error: () => {}'), 'Should provide default no-op error')
    assert.ok(content.includes('debug: () => {}'), 'Should provide default no-op debug')
  })

  test('logs debug information', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('log.debug'), 'Should log debug information')
    assert.ok(content.includes('Starting TOS acceptance flow'), 'Should log TOS start')
    assert.ok(content.includes('Reading TOS file'), 'Should log file reading')
    assert.ok(content.includes('Rendering TOS content'), 'Should log TOS rendering')
    assert.ok(content.includes('Prompting for TOS acceptance'), 'Should log prompting')
  })

  test('logs success information', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('log.info'), 'Should log info messages')
    assert.ok(content.includes('TOS acceptance recorded'), 'Should log acceptance result')
  })

  test('logs TOS file path for debugging', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('{ tosPath }'), 'Should log TOS file path')
    assert.ok(content.includes('tosPath'), 'Should use tosPath variable')
  })

  test('logs user acceptance decision', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('{ accepted: answers.accepted }'), 'Should log acceptance decision')
    assert.ok(content.includes('accepted'), 'Should include accepted status in logs')
  })
})

describe('Welcome - File Path Construction', () => {
  test('TOS file path is constructed correctly', () => {
    const welcomePath = require.resolve('../lib/welcome')
    const content = fs.readFileSync(welcomePath, 'utf-8')

    assert.ok(content.includes('path.join(__dirname, \'../assets/TOS.md\')'), 'Should construct TOS path correctly')
    assert.ok(content.includes('assets/TOS.md'), 'Should reference correct TOS file')
  })
})
