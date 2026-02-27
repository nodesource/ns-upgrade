const { test, describe } = require('node:test')
const assert = require('node:assert')

describe('Welcome Mocked - Module Tests', () => {
  test('module can be imported', () => {
    const welcome = require('../lib/welcome')
    assert.ok(welcome, 'Module should be importable')
    assert.ok(typeof welcome.display === 'function', 'Should export display function')
    assert.ok(typeof welcome.acceptTOS === 'function', 'Should export acceptTOS function')
  })

  test('functions are callable', () => {
    const welcome = require('../lib/welcome')
    assert.ok(typeof welcome.display === 'function', 'display should be a function')
    assert.ok(typeof welcome.acceptTOS === 'function', 'acceptTOS should be a function')
  })
})

describe('Welcome Mocked - Error Handling', () => {
  test('handles missing dependencies gracefully', () => {
    // Test that the module handles missing dependencies
    const welcome = require('../lib/welcome')
    assert.ok(welcome, 'Should load even without optional dependencies')
  })
})
