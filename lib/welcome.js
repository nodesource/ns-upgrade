const fs = require('node:fs')
const path = require('node:path')
const { marked } = require('marked')
const { markedTerminal } = require('marked-terminal')
const { cyan } = require('colorette')

// Configure marked for terminal output
marked.use(markedTerminal())

const logo = require('../assets/logo')

function display () {
  console.clear()
  console.log(cyan(logo))
}

async function acceptTOS (logger = null) {
  const log = logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

  try {
    log.debug('Starting TOS acceptance flow')

    // Import inquirer dynamically (ESM module)
    const inquirer = await import('inquirer')

    // Read TOS file
    const tosPath = path.join(__dirname, '../assets/TOS.md')
    log.debug('Reading TOS file', { tosPath })

    let tosContent
    try {
      tosContent = fs.readFileSync(tosPath, 'utf-8')
    } catch (error) {
      log.error('Failed to read TOS file', error)
      throw new Error('Unable to read Terms of Service file. Please contact support.')
    }

    // Render TOS
    log.debug('Rendering TOS content')
    const renderedTOS = marked(tosContent)
    console.log(renderedTOS)

    // Prompt for acceptance
    log.debug('Prompting for TOS acceptance')
    const answers = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'accepted',
        message: 'Do you accept the Terms of Service?',
        default: false
      }
    ])

    log.info('TOS acceptance recorded', { accepted: answers.accepted })
    return answers.accepted
  } catch (error) {
    log.error('TOS acceptance failed', error)
    throw error
  }
}

module.exports = {
  display,
  acceptTOS
}
