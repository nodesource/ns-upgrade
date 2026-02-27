/**
 * Submit module for sending reports to NodeSource API
 */

const { green, red, yellow, cyan, bold, gray } = require('colorette')
const { marked } = require('marked')
const { markedTerminal } = require('marked-terminal')

/**
 * Create default logger if none provided
 * @param {Object} logger - Optional logger instance
 * @returns {Object} Logger instance
 */
function createLogger (logger) {
  return (
    logger || {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {}
    }
  )
}

/**
 * Default inquirer loader
 * @returns {Promise<Object>} Inquirer module
 */
async function defaultInquirerLoader () {
  return await import('inquirer')
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean|string} True if valid, error message if invalid
 */
function validateEmail (email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || email.trim().length === 0) {
    return 'Email is required'
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }
  return true
}

/**
 * Validate name (non-empty string)
 * @param {string} name - Name to validate
 * @returns {boolean|string} True if valid, error message if invalid
 */
function validateName (name) {
  if (!name || name.trim().length === 0) {
    return 'Name is required'
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters'
  }
  return true
}

/**
 * Validate company (non-empty string)
 * @param {string} company - Company to validate
 * @returns {boolean|string} True if valid, error message if invalid
 */
function validateCompany (company) {
  if (!company || company.trim().length === 0) {
    return 'Company name is required'
  }
  return true
}

/**
 * Display the actual JSON content that will be sent
 * @param {Object} reportData - The report data to display
 * @param {Object} logger - Logger instance
 */
function displayRawJSON (reportData, logger = null) {
  const log = createLogger(logger)

  try {
    log.debug('Displaying raw JSON content')

    console.log('\n' + cyan('━'.repeat(80)))
    console.log(bold(yellow('📋 Full Report Content')))
    console.log(cyan('━'.repeat(80)))
    console.log(
      gray('\nThis is the exact data that will be sent to NodeSource:\n')
    )

    // Create a display copy with lockfile content summarized
    const displayData = JSON.parse(JSON.stringify(reportData))

    // Replace verbose lockfile content with summary (plural)
    if (displayData.scannedData?.lockfiles) {
      const lockfiles = displayData.scannedData.lockfiles
      displayData.scannedData.lockfiles = Object.keys(lockfiles).reduce(
        (acc, key) => {
          if (lockfiles[key]?.content) {
            const contentLength = JSON.stringify(lockfiles[key].content).length
            acc[key] = {
              ...lockfiles[key],
              content: `[Lockfile content omitted for display - ${Math.round(contentLength / 1024)} KB]`
            }
          } else {
            acc[key] = lockfiles[key]
          }
          return acc
        },
        {}
      )
    }

    // Replace verbose lockfile content with summary (singular)
    if (displayData.scannedData?.lockfile?.content) {
      const contentLength = JSON.stringify(
        displayData.scannedData.lockfile.content
      ).length
      displayData.scannedData.lockfile = {
        ...displayData.scannedData.lockfile,
        content: `[Lockfile content omitted for display - ${Math.round(contentLength / 1024)} KB]`
      }
    }

    // Display the JSON with syntax highlighting using marked-terminal
    const jsonString = JSON.stringify(displayData, null, 2)

    try {
      // Try to use marked-terminal for syntax highlighting
      marked.use(markedTerminal())

      // Wrap JSON in markdown code block for syntax highlighting
      const markdown = '```json\n' + jsonString + '\n```'
      const rendered = marked(markdown)

      console.log(rendered)
    } catch (markedError) {
      // Fallback to plain JSON display if marked-terminal fails
      log.debug('Marked-terminal failed, using plain display', markedError)
      console.log(gray(jsonString))
    }

    console.log(cyan('━'.repeat(80)) + '\n')
    console.log(
      gray(
        'Total size: ' +
          Math.round(JSON.stringify(reportData).length / 1024) +
          ' KB'
      )
    )
    console.log(
      yellow(
        'Note: Full lockfile content is included in the file that will be sent.\n'
      )
    )
  } catch (error) {
    log.error('Error displaying raw JSON', error)
    console.error(red('⚠ Could not display JSON content'))
  }
}

/**
 * Prompt user if they want to submit the report
 * @param {Object} logger - Logger instance
 * @param {Function} inquirerLoader - Function to load inquirer module
 * @returns {Promise<boolean>} True if user wants to submit
 */
async function promptSubmit (
  logger = null,
  inquirerLoader = defaultInquirerLoader
) {
  const log = createLogger(logger)

  try {
    log.debug('Loading inquirer module for submit prompt')
    const inquirer = await inquirerLoader()
    const inquirerInstance = inquirer.default || inquirer

    console.log('\n' + cyan('━'.repeat(80)))
    console.log(yellow('📤 Submit Report to NodeSource'))
    console.log(cyan('━'.repeat(80)))
    console.log(
      '\nWould you like to submit this report to NodeSource for a ' +
        green('FREE') +
        ' pre-update assessment?'
    )
    console.log(
      yellow(
        'This will help us provide personalized recommendations for your upgrade.\n'
      )
    )

    const { submit } = await inquirerInstance.prompt([
      {
        type: 'confirm',
        name: 'submit',
        message: 'Submit report to NodeSource?',
        default: false
      }
    ])

    log.debug('User submit choice', { submit })
    return submit
  } catch (error) {
    log.error('Error prompting for submit', error)
    throw error
  }
}

/**
 * Collect user information for submission
 * @param {Object} logger - Logger instance
 * @param {Function} inquirerLoader - Function to load inquirer module
 * @returns {Promise<Object>} User information {name, email, company}
 */
async function collectUserInfo (
  logger = null,
  inquirerLoader = defaultInquirerLoader
) {
  const log = createLogger(logger)

  try {
    log.debug('Loading inquirer module for user info')
    const inquirer = await inquirerLoader()
    const inquirerInstance = inquirer.default || inquirer

    console.log('\n' + cyan('Please provide your contact information:\n'))

    const answers = await inquirerInstance.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Your name:',
        validate: validateName
      },
      {
        type: 'input',
        name: 'email',
        message: 'Your email:',
        validate: validateEmail
      },
      {
        type: 'input',
        name: 'company',
        message: 'Company name:',
        validate: validateCompany
      }
    ])

    log.debug('User info collected', {
      name: answers.name,
      email: answers.email,
      company: answers.company
    })

    return {
      name: answers.name.trim(),
      email: answers.email.trim(),
      company: answers.company.trim()
    }
  } catch (error) {
    log.error('Error collecting user info', error)
    throw error
  }
}

/**
 * Submit report to NodeSource API
 * @param {Object} reportData - The report data to submit
 * @param {Object} userInfo - User information {name, email, company}
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} API response
 */
async function submitReport (reportData, userInfo, logger = null) {
  const log = createLogger(logger)
  const apiUrl = 'https://upgrade.nodesource.io'

  try {
    log.info('Submitting report to NodeSource API', {
      apiUrl,
      userEmail: userInfo.email,
      company: userInfo.company
    })

    console.log(yellow('\n📤 Submitting report to NodeSource...'))

    const payload = {
      report: reportData,
      user: userInfo,
      submittedAt: new Date().toISOString()
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'nodesource-cli/upgrade',
        'x-client-source': 'nodesource-cli-v1'
      },
      body: JSON.stringify(payload)
    })

    const responseData = await response.json().catch(() => ({
      message: 'No JSON response from server'
    }))

    if (!response.ok) {
      log.error('API submission failed', {
        status: response.status,
        statusText: response.statusText,
        response: responseData
      })
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      )
    }

    log.info('Report submitted successfully', {
      status: response.status,
      response: responseData
    })

    console.log(green('✓ Report submitted successfully!'))
    console.log(
      cyan("\nThank you! We'll review your report and get back to you soon.")
    )

    if (responseData.message) {
      console.log(yellow(`\n${responseData.message}`))
    }

    return responseData
  } catch (error) {
    log.error('Error submitting report', error)

    if (
      error.cause?.code === 'ENOTFOUND' ||
      error.message.includes('fetch failed')
    ) {
      console.error(
        red('\n✖ Network error: Could not connect to NodeSource API')
      )
      console.error(
        yellow('  Please check your internet connection and try again later.')
      )
    } else {
      console.error(red(`\n✖ Error submitting report: ${error.message}`))
    }

    throw error
  }
}

/**
 * Handle the complete submission flow
 * @param {Object} reportData - The report data to submit
 * @param {string} outputPath - Path to the output file
 * @param {Object} logger - Logger instance
 * @returns {Promise<boolean>} True if submitted successfully, false if declined or failed
 */
async function handleSubmission (reportData, outputPath, logger = null) {
  const log = createLogger(logger)

  try {
    // Display the actual JSON content that will be sent
    displayRawJSON(reportData, log)

    // Ask if user wants to submit
    const wantsToSubmit = await promptSubmit(log)

    if (!wantsToSubmit) {
      log.info('User declined to submit report')
      console.log(
        yellow(
          '\nNo problem! You can submit the report later if you change your mind.'
        )
      )
      console.log(cyan(`Report saved to: ${outputPath}\n`))
      return false
    }

    // Collect user information
    const userInfo = await collectUserInfo(log)

    // Submit the report
    await submitReport(reportData, userInfo, log)

    return true
  } catch (error) {
    log.error('Submission flow failed', error)
    return false
  }
}

module.exports = {
  displayRawJSON,
  promptSubmit,
  collectUserInfo,
  submitReport,
  handleSubmission,
  validateEmail,
  validateName,
  validateCompany
}
