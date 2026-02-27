/**
 * Prompt runner with dependency injection for testing
 */

/**
 * Default inquirer loader that imports inquirer dynamically
 * @returns {Promise<Object>} Inquirer module
 */
async function defaultInquirerLoader () {
  const inquirer = await import('inquirer')
  return inquirer.default
}

/**
 * Run prompts with given configuration and inquirer instance
 * @param {Array} promptConfig - Array of prompt configuration objects
 * @param {Function} inquirerLoader - Function that loads inquirer (for dependency injection)
 * @returns {Promise<Object>} User answers
 */
async function runPrompts (promptConfig, inquirerLoader = defaultInquirerLoader) {
  const inquirer = await inquirerLoader()
  return await inquirer.prompt(promptConfig)
}

module.exports = {
  runPrompts,
  defaultInquirerLoader
}
