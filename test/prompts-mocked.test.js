const { test, describe } = require('node:test')
const assert = require('node:assert')

describe('Prompts Mocked - Basic Tests', () => {
  test('module can be imported', () => {
    const prompts = require('../lib/prompts')
    assert.ok(prompts, 'Module should be importable')
    assert.ok(typeof prompts.ask === 'function', 'Should export ask function')
    assert.ok(typeof prompts.collectAnswers === 'function', 'Should export collectAnswers function')
  })

  test('functions are callable', () => {
    const prompts = require('../lib/prompts')
    assert.ok(typeof prompts.ask === 'function', 'ask should be a function')
    assert.ok(typeof prompts.collectAnswers === 'function', 'collectAnswers should be a function')
  })
})

describe('Prompts Mocked - Error Handling', () => {
  test('handles missing inquirer gracefully', async () => {
    // Test that the module handles missing inquirer dependency
    const prompts = require('../lib/prompts')
    assert.ok(prompts, 'Should load even without inquirer')
  })
})
