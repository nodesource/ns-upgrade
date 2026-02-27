/**
 * Local helper utilities for CLI tool
 */

const chalk = require('chalk')

function formatOutput (message, type = 'info') {
  const prefix = {
    info: chalk.blue('[INFO]'),
    success: chalk.green('[SUCCESS]'),
    warning: chalk.yellow('[WARNING]'),
    error: chalk.red('[ERROR]')
  }

  return `${prefix[type] || prefix.info} ${message}`
}

function calculate (a, b, operation) {
  const operations = {
    add: a + b,
    subtract: a - b,
    multiply: a * b,
    divide: b !== 0 ? a / b : 'Cannot divide by zero'
  }

  return `Result: ${operations[operation] || 'Unknown operation'}`
}

function getCurrentDateTime () {
  return new Date().toISOString()
}

function validateInput (input, minLength = 1) {
  return typeof input === 'string' && input.length >= minLength
}

module.exports = {
  formatOutput,
  calculate,
  getCurrentDateTime,
  validateInput
}
