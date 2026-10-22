#!/usr/bin/env node

const { parseArgs } = require('node:util')
const { red, green, yellow, cyan } = require('colorette')

// Global logger reference for error handlers
let globalLogger = null

/**
 * Handle uncaught exceptions gracefully
 * @param {Error} error - The uncaught exception
 */
function handleUncaughtException (error) {
  if (globalLogger) {
    globalLogger.error('Uncaught exception', error)
    globalLogger.close()
  }
  console.error(red('✗ Unexpected error occurred. Check log file for details.'))
  process.exit(1)
}

/**
 * Handle unhandled promise rejections gracefully
 * @param {Error} error - The unhandled rejection
 */
function handleUnhandledRejection (error) {
  if (globalLogger) {
    globalLogger.error('Unhandled promise rejection', error)
    globalLogger.close()
  }
  console.error(red('✗ Unexpected error occurred. Check log file for details.'))
  process.exit(1)
}

/**
 * Handle SIGINT (Ctrl+C) gracefully
 */
function handleSigint () {
  if (globalLogger) {
    globalLogger.warn('Process interrupted by user (SIGINT)')
    globalLogger.close()
  }
  console.log(yellow('\n✓ Process cancelled by user.'))
  process.exit(0)
}

/**
 * Handle SIGTERM gracefully
 */
function handleSigterm () {
  if (globalLogger) {
    globalLogger.warn('Process terminated (SIGTERM)')
    globalLogger.close()
  }
  console.log(yellow('\n✓ Process terminated.'))
  process.exit(0)
}

// Set up global error handlers
process.on('uncaughtException', handleUncaughtException)
process.on('unhandledRejection', handleUnhandledRejection)
process.on('SIGINT', handleSigint)
process.on('SIGTERM', handleSigterm)

// Check Node.js version
const nodeVersion = process.versions.node
const majorVersion = parseInt(nodeVersion.split('.')[0], 10)

if (majorVersion < 22) {
  console.error(red('✖ Error: This tool requires Node.js 22 or higher.'))
  console.error(red(`  You are currently running Node.js ${nodeVersion}.`))
  console.error(yellow('  Please run the tool using:'))
  console.error(cyan('  npx -p node@latest -p @nodesource/upgrade nodesource-upgrade'))
  process.exit(1)
}

// Parse CLI arguments using util.parseArgs
let parsedFlags
try {
  const { values: flags } = parseArgs({
    options: {
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
        description: 'Show help information'
      },
      version: {
        type: 'boolean',
        short: 'v',
        default: false,
        description: 'Show version'
      },
      output: {
        type: 'string',
        short: 'o',
        description: 'Output file path'
      },
      exclude: {
        type: 'string',
        short: 'e',
        multiple: true,
        description: 'Exclude patterns'
      },
      'skip-workspace-scan': {
        type: 'boolean',
        default: false,
        description: 'Skip workspace scan'
      },
      'local-only': {
        type: 'boolean',
        default: false,
        description: 'Only scan local dependencies'
      },
      'skip-tarballs': {
        type: 'boolean',
        default: false,
        description: 'Skip tarball discovery'
      },
      log: {
        type: 'string',
        short: 'l',
        description: 'Log file path'
      },
      'max-files': {
        type: 'string',
        description: 'Maximum number of package.json files to scan'
      },
      'scan-depth': {
        type: 'string',
        description: 'Maximum depth for file scanning'
      }
    },
    strict: true,
    allowPositionals: true
  })

  // Convert kebab-case keys to camelCase for internal use
  parsedFlags = {
    help: flags.help,
    version: flags.version,
    output: flags.output || null,
    exclude: flags.exclude || [],
    skipWorkspaceScan: flags['skip-workspace-scan'],
    localOnly: flags['local-only'],
    skipTarballs: flags['skip-tarballs'],
    log: flags.log || null,
    maxFiles: flags['max-files'] ? parseInt(flags['max-files'], 10) : undefined,
    scanDepth: flags['scan-depth'] ? parseInt(flags['scan-depth'], 10) : undefined
  }
} catch (error) {
  console.error(red('✖ Error parsing arguments:'), error.message)
  console.error(yellow('Use --help for usage information.'))
  process.exit(1)
}

// Handle --help flag
if (parsedFlags.help) {
  const pkg = require('../package.json')
  const { PACKAGE_JSON_LIMITS } = require('../lib/constants')
  console.log(`
${cyan('@nodesource/upgrade')} v${pkg.version}

${yellow('DESCRIPTION:')}
  Analyze your Node.js project and generate upgrade recommendations
  for Node.js versions, dependencies, and production environments.

${yellow('USAGE:')}
  ${green('npx -p node@latest -p @nodesource/upgrade nodesource-upgrade')} [options]
  ${green('pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade')} [options]
  ${green('yarn dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade')} [options]

${yellow('OPTIONS:')}
  ${green('-h, --help')}              Show this help information
  ${green('-v, --version')}           Show version number
  ${green('-o, --output <path>')}     Output file path (default: nodesource-discovery.json)
  ${green('-e, --exclude <pattern>')} Exclude patterns (can be used multiple times)
  ${green('--skip-workspace-scan')}   Skip workspace scanning
  ${green('--local-only')}            Only scan local dependencies
  ${green('--skip-tarballs')}         Skip tarball discovery
  ${green('-l, --log <path>')}        Log file path
  ${green('--max-files <number>')}    Maximum number of package.json files to scan (default: ${PACKAGE_JSON_LIMITS.maxFiles})
  ${green('--scan-depth <number>')}   Maximum depth for file scanning (default: ${PACKAGE_JSON_LIMITS.scanDepth})

${yellow('EXAMPLES:')}
  ${green('npx -p node@latest -p @nodesource/upgrade nodesource-upgrade')}                                    Basic analysis
  ${green('npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --output my-report.json')}           Save to custom file
  ${green('pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --exclude "*.test.js"')}        Exclude test files
  ${green('yarn dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --local-only')}                 Local scan only
  ${green('npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log debug.log')}                   Enable logging

${yellow('FOR MORE INFORMATION:')}
  Visit: ${cyan('https://github.com/nodesource/ns-upgrade')}
`)
  process.exit(0)
}

// Handle --version flag
if (parsedFlags.version) {
  const pkg = require('../package.json')
  console.log(`@nodesource/upgrade v${pkg.version}`)
  process.exit(0)
}

// Main execution
async function main () {
  // Initialize logger
  const { createLogger } = require('../lib/logger')
  const logger = createLogger(parsedFlags.log)

  // Set global logger reference for error handlers
  globalLogger = logger

  try {
    logger.info('CLI started', { flags: parsedFlags, nodeVersion, cwd: process.cwd() })

    const welcome = require('../lib/welcome')
    const prompts = require('../lib/prompts')
    const scanner = require('../lib/scanner')
    const analyzer = require('../lib/scanner/analyzer')
    const output = require('../lib/output')
    const detectors = require('../lib/detectors')

    // Display welcome and get TOS acceptance
    logger.startOperation('Display Welcome and TOS')
    welcome.display()
    const accepted = await welcome.acceptTOS(logger)
    logger.endOperation('Display Welcome and TOS', accepted)

    if (!accepted) {
      logger.warn('TOS not accepted by user')
      console.log(yellow('TOS not accepted. Exiting.'))
      logger.close()
      process.exit(1)
    }

    // Validate package.json exists and is readable
    logger.startOperation('Validate package.json')
    try {
      const utils = require('../lib/utils')
      utils.validatePackageJson()
      logger.info('package.json validated successfully')
      logger.endOperation('Validate package.json', true)
    } catch (error) {
      logger.error('package.json validation failed', error)
      logger.endOperation('Validate package.json', false)
      console.error(red(`✖ Error: ${error.message}`))
      logger.close()
      process.exit(1)
    }

    // Detect current Node.js version with detailed logging
    logger.startOperation('Detect Node.js version')
    const nodeVersionInfo = detectors.detectNodeVersion(logger)
    logger.info('Node.js version detected', {
      version: nodeVersionInfo.version,
      versionManager: nodeVersionInfo.versionManager
    })
    logger.endOperation('Detect Node.js version', true)

    // Get user input
    logger.startOperation('Collect user input')
    const userInput = await prompts.ask(nodeVersionInfo, logger)
    logger.info('User input collected', { userInput })
    logger.endOperation('Collect user input', true)

    // Scan environment
    logger.startOperation('Scan environment')
    const scanData = await scanner.scan(parsedFlags.exclude, {
      skipWorkspaceScan: parsedFlags.skipWorkspaceScan,
      localOnly: parsedFlags.localOnly,
      skipTarballs: parsedFlags.skipTarballs,
      maxFiles: parsedFlags.maxFiles,
      scanDepth: parsedFlags.scanDepth,
      logger
    })
    logger.info('Environment scan completed', {
      packagesFound: scanData.scannedData.allPackageJsons.length,
      warningsCount: scanData.warnings.length
    })
    logger.endOperation('Scan environment', true)

    // Run static analysis
    logger.startOperation('Run static analysis')
    const analysisData = await analyzer.analyze(userInput.targetLtsVersion, parsedFlags.exclude, logger)
    logger.info('Static analysis completed', {
      status: analysisData.status,
      findingsCount: analysisData.findings.length
    })
    logger.endOperation('Run static analysis', analysisData.status === 'success')

    // Generate output
    logger.startOperation('Generate output file')
    const generatedOutput = await output.generate({
      userInput,
      scanData,
      analysisData,
      outputPath: parsedFlags.output,
      logger
    })
    logger.info('Output file generated successfully')
    logger.endOperation('Generate output file', true)

    console.log(green('✓ Success! Your upgrade report has been created.'))

    // Display the report content
    logger.startOperation('Display report')
    const display = require('../lib/display')
    const fs = require('node:fs')

    try {
      const reportPath = generatedOutput.filePath
      const reportContent = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
      display.displayJSON(reportContent)
      logger.endOperation('Display report', true)
    } catch (error) {
      logger.error('Error displaying report', error)
      logger.endOperation('Display report', false)
      console.error(yellow('⚠ Could not display report content, but file was saved successfully.'))
    }

    // Handle submission to NodeSource
    logger.startOperation('Handle report submission')
    const submit = require('../lib/submit')
    try {
      const reportPath = generatedOutput.filePath
      const reportContent = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
      await submit.handleSubmission(reportContent, reportPath, logger)
      logger.endOperation('Handle report submission', true)
    } catch (error) {
      logger.error('Error in submission flow', error)
      logger.endOperation('Handle report submission', false)
      // Don't fail the entire process if submission fails
      console.log(yellow('\nYour report has been saved locally.'))
      console.log(cyan(`Report location: ${generatedOutput.filePath}`))
    }

    console.log(green('\n✓ All done! Thank you for using @nodesource/upgrade.'))

    logger.info('CLI completed successfully')
    logger.close()
    process.exit(0)
  } catch (error) {
    if (error && typeof error.message === 'string' &&
        error.message.includes('User force closed the prompt with SIGINT')) {
      logger.warn('Process cancelled by user during interactive prompt (SIGINT)')
      logger.close()
      console.log(yellow('\n✓ Process cancelled by the user.'))
      process.exit(0)
    }

    logger.error('CLI execution failed', error)
    logger.close()
    console.error(red(`✖ Error: ${error.message}`))
    process.exit(1)
  }
}

main()
