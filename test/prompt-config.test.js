const { test, describe } = require('node:test')
const assert = require('node:assert')
const { createPromptConfig } = require('../lib/prompts/prompt-config')

describe('Prompt Config - createPromptConfig', () => {
  test('creates config with detected version', () => {
    const config = createPromptConfig('v20.10.0', '20')

    assert.strictEqual(Array.isArray(config), true)
    assert.strictEqual(config.length, 9)

    // Check first question (current Node.js version)
    const firstQuestion = config[0]
    assert.strictEqual(firstQuestion.type, 'list')
    assert.strictEqual(firstQuestion.name, 'currentNodeVersion')
    assert.strictEqual(firstQuestion.default, '20')
    assert(firstQuestion.message.includes('We detected Node.js v20.10.0'))
  })

  test('creates config without detected version', () => {
    const config = createPromptConfig(null, null)

    const firstQuestion = config[0]
    assert.strictEqual(firstQuestion.default, '20')
    assert.strictEqual(firstQuestion.message, 'What is your app\'s current Node.js version?')
  })

  test('includes all required question types', () => {
    const config = createPromptConfig()

    const questionTypes = config.map(q => q.type)
    assert(questionTypes.includes('list'))
    assert(questionTypes.includes('input'))
    assert(questionTypes.includes('checkbox'))
  })

  test('includes conditional questions with when functions', () => {
    const config = createPromptConfig()

    // Custom Node.js version question
    const customVersionQuestion = config.find(q => q.name === 'currentNodeVersionCustom')
    assert.strictEqual(typeof customVersionQuestion.when, 'function')

    // Custom production OS question
    const customProductionOS = config.find(q => q.name === 'productionOSCustom')
    assert.strictEqual(typeof customProductionOS.when, 'function')

    // Custom development OS question
    const customDevelopmentOS = config.find(q => q.name === 'developmentOSCustom')
    assert.strictEqual(typeof customDevelopmentOS.when, 'function')
  })

  test('includes validation functions', () => {
    const config = createPromptConfig()

    // Custom version validation
    const customVersionQuestion = config.find(q => q.name === 'currentNodeVersionCustom')
    assert.strictEqual(typeof customVersionQuestion.validate, 'function')

    // OS selection validation
    const osQuestion = config.find(q => q.name === 'productionOS')
    assert.strictEqual(typeof osQuestion.validate, 'function')

    // Additional notes validation
    const notesQuestion = config.find(q => q.name === 'additionalNotes')
    assert.strictEqual(typeof notesQuestion.validate, 'function')
  })

  test('uses correct default values', () => {
    const config = createPromptConfig()

    const versionQuestion = config.find(q => q.name === 'currentNodeVersion')
    assert.strictEqual(versionQuestion.default, '20')

    const ltsQuestion = config.find(q => q.name === 'targetLtsVersion')
    assert.strictEqual(ltsQuestion.default, '24')

    const productionOSQuestion = config.find(q => q.name === 'productionOS')
    assert.deepStrictEqual(productionOSQuestion.default, ['Ubuntu Linux'])

    const developmentOSQuestion = config.find(q => q.name === 'developmentOS')
    assert.deepStrictEqual(developmentOSQuestion.default, ['macOS'])

    const ciQuestion = config.find(q => q.name === 'ciEnvironment')
    assert.strictEqual(ciQuestion.default, 'None')

    const notesQuestion = config.find(q => q.name === 'additionalNotes')
    assert.strictEqual(notesQuestion.default, '')
  })
})
