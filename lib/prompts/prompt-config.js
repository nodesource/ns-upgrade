const { TARGET_LTS_VERSIONS, CURRENT_NODE_VERSIONS, PRODUCTION_OS_OPTIONS, DEVELOPMENT_OS_OPTIONS, CI_SYSTEMS } = require('../constants')
const { validateCustomNodeVersion, validateCustomOS, validateAdditionalNotes, validateOSSelection } = require('../validators')

/**
 * Create prompt configuration for user input
 * @param {string} detectedNodeVersion - Detected Node.js version (e.g., "v20.10.0")
 * @param {string} detectedMajor - Extracted major version
 * @returns {Array} Array of prompt configuration objects
 */
function createPromptConfig (detectedNodeVersion = null, detectedMajor = null) {
  return [
    // Question 0: Current Node.js version
    {
      type: 'list',
      name: 'currentNodeVersion',
      message: detectedNodeVersion
        ? `We detected Node.js ${detectedNodeVersion}. Please confirm or select your app's current Node.js version:`
        : "What is your app's current Node.js version?",
      choices: CURRENT_NODE_VERSIONS,
      default: detectedMajor || '20'
    },
    // Question 0b: Custom current Node.js version if "Other" selected
    {
      type: 'input',
      name: 'currentNodeVersionCustom',
      message: 'Please specify your current Node.js version (e.g., 21, 23):',
      when: (answers) => answers.currentNodeVersion === 'custom',
      validate: validateCustomNodeVersion
    },
    // Question 1: Target Node.js LTS version
    {
      type: 'list',
      name: 'targetLtsVersion',
      message: 'Which Node.js LTS version would you like to upgrade to?',
      choices: TARGET_LTS_VERSIONS,
      default: '24'
    },
    // Question 2: Production OS
    {
      type: 'checkbox',
      name: 'productionOS',
      message:
        'What Operating System(s) does your application run on in Production?',
      choices: PRODUCTION_OS_OPTIONS,
      default: ['Ubuntu Linux'],
      validate: validateOSSelection
    },
    // Question 2b: Custom production OS if "Other" selected
    {
      type: 'input',
      name: 'productionOSCustom',
      message: 'Please specify your production OS:',
      when: (answers) => answers.productionOS.includes('Other'),
      validate: validateCustomOS
    },
    // Question 3: Development OS
    {
      type: 'checkbox',
      name: 'developmentOS',
      message: 'What Operating System(s) do you use for Development?',
      choices: DEVELOPMENT_OS_OPTIONS,
      default: ['macOS'],
      validate: validateOSSelection
    },
    // Question 3b: Custom development OS if "Other" selected
    {
      type: 'input',
      name: 'developmentOSCustom',
      message: 'Please specify your development OS:',
      when: (answers) => answers.developmentOS.includes('Other'),
      validate: validateCustomOS
    },
    // Question 4: CI/CD system
    {
      type: 'list',
      name: 'ciEnvironment',
      message: 'What CI/CD system do you use?',
      choices: Object.keys(CI_SYSTEMS),
      default: 'None'
    },
    // Question 5: Additional notes
    {
      type: 'input',
      name: 'additionalNotes',
      message:
        'Any additional notes or context about your project? (Optional, max 500 chars)',
      default: '',
      validate: validateAdditionalNotes
    }
  ]
}

module.exports = {
  createPromptConfig
}
