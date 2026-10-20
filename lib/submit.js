/**
 * Submit module for sending reports to NodeSource API
 */

const { green, red, yellow, cyan, bold, gray } = require('colorette')
const { marked } = require('marked')
const { markedTerminal } = require('marked-terminal')
const { ACCOUNTS_URL, SUBMIT_URL } = require('./constants')
const { login } = require('./auth')

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
 * Validate name (optional CRM field)
 * @param {string} name - Name to validate
 * @returns {boolean|string} True if valid, error message if invalid
 */
function validateName (name) {
  if (name === undefined || name === null || typeof name === 'string') {
    return true
  }
  return 'Please enter a valid name'
}

/**
 * Validate company (optional CRM field)
 * @param {string} company - Company to validate
 * @returns {boolean|string} True if valid, error message if invalid
 */
function validateCompany (company) {
  if (company === undefined || company === null || typeof company === 'string') {
    return true
  }
  return 'Please enter a valid company name'
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
        message: 'Your name (optional):',
        validate: validateName
      },
      {
        type: 'input',
        name: 'email',
        message: 'Delivery email:',
        validate: validateEmail
      },
      {
        type: 'input',
        name: 'company',
        message: 'Company name (optional):',
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
 * Reports URL for the organization in the accounts-ui
 * @returns {string} Reports URL
 */
function reportsUrl () {
  const accountsUrl = process.env.NODESOURCE_ACCOUNTS_URL || ACCOUNTS_URL
  return new URL('/reports', accountsUrl).toString()
}

/**
 * Submit report to NodeSource API under the organization session
 * @param {Object} reportData - The report data to submit
 * @param {Object} userInfo - Delivery address and optional CRM fields
 * @param {Object} session - Organization session { token }
 * @param {Object} logger - Logger instance
 * @param {Object} deps - Optional injections { relogin }
 * @returns {Promise<Object>} API response
 */
async function submitReport (reportData, userInfo, session, logger = null, deps = {}) {
  const log = createLogger(logger)
  const submitUrl = process.env.NODESOURCE_SUBMIT_URL || SUBMIT_URL

  const post = (token, orgId = session.consoleId) => fetch(submitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'nodesource-cli/upgrade',
      'x-client-source': 'nodesource-cli-v2',
      'x-upgrade-version': 'v2',
      'x-org-id': orgId,
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      report: reportData,
      user: userInfo,
      submittedAt: new Date().toISOString()
    })
  })

  try {
    log.info('Submitting report to NodeSource API', {
      submitUrl,
      userEmail: userInfo.email,
      company: userInfo.company
    })

    console.log(yellow('\n📤 Submitting report to NodeSource...'))

    let token = session?.token
    let response = await post(token)
    let responseData = await response.json().catch(() => ({
      message: 'No JSON response from server'
    }))

    if (response.status === 401) {
      if (typeof deps.relogin !== 'function') {
        throw new Error('API request failed: 401 Unauthorized')
      }
      log.info('Session rejected, re-authenticating once')
      const freshSession = await deps.relogin()
      token = freshSession?.token
      response = await post(token, freshSession?.consoleId || session.consoleId)
      responseData = await response.json().catch(() => ({
        message: 'No JSON response from server'
      }))
      if (response.status === 401) {
        throw new Error('API request failed: 401 Unauthorized after re-authentication')
      }
    }

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
      status: response.status
    })

    console.log(green('✓ Report submitted successfully!'))
    console.log(
      cyan("\nThank you! We'll review your report and get back to you soon.")
    )

    if (responseData.message) {
      console.log(yellow(`\n${responseData.message}`))
    }
    console.log(cyan(`Status: ${responseData.status || 'queued'}`))
    console.log(cyan(`Reports URL: ${reportsUrl()}`))

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
      console.error(red(`\n✖ Submit error: ${error.message}`))
    }

    throw error
  }
}

/**
 * Handle the complete submission flow
 * @param {Object} reportData - The report data to submit
 * @param {string} outputPath - Path to the output file
 * @param {Object} logger - Logger instance
 * @param {Object} deps - Optional injections for tests
 * @returns {Promise<boolean>} True if submitted successfully, false if declined or failed
 */
async function handleSubmission (reportData, outputPath, logger = null, deps = {}) {
  const log = createLogger(logger)
  const displayFn = deps.displayRawJSON || displayRawJSON
  const promptSubmitFn = deps.promptSubmit || promptSubmit
  const collectUserInfoFn = deps.collectUserInfo || collectUserInfo
  const loginFn = deps.login || login
  const submitReportFn = deps.submitReport || submitReport

  try {
    displayFn(reportData, log)

    const wantsToSubmit = await promptSubmitFn(log)

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

    const userInfo = await collectUserInfoFn(log)

    let session
    try {
      session = await loginFn()
    } catch (error) {
      log.error('Authentication failed', { reason: error.reason })
      console.log(red('\n✖ Authentication failed. No report was submitted.'))
      if (error.reason === 'timeout') {
        console.log(yellow('  Authentication timed out. If you just created a NodeSource account,'))
        console.log(yellow('  verify your email address, then run the command again to sign in.'))
      } else {
        console.log(yellow('  If you just created a NodeSource account, verify your email address,'))
        console.log(yellow('  then run the command again to sign in.'))
      }
      return false
    }

    await submitReportFn(reportData, userInfo, session, log, { relogin: loginFn })

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
