/**
 * Local utility functions for demo app
 */

function greet (name) {
  return `Hello from local-utils, ${name}!`
}

function add (a, b) {
  return a + b
}

function getCurrentTimestamp () {
  return new Date().toISOString()
}

module.exports = {
  greet,
  add,
  getCurrentTimestamp
}
