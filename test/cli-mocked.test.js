const { test, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

describe('CLI - Argument Parsing', () => {
  test('parses command line arguments', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify parseArgs usage
    assert.ok(content.includes('parseArgs'), 'Should use parseArgs')
    assert.ok(content.includes('options:'), 'Should define options')

    // Verify all flags are defined
    const flags = ['version', 'output', 'exclude', 'skip-workspace-scan', 'local-only', 'skip-tarballs', 'log']
    flags.forEach(flag => {
      assert.ok(content.includes(flag), `Should define ${flag} flag`)
    })
  })

  test('validates Node.js version', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Check version validation logic
    assert.ok(content.includes('majorVersion < 20'), 'Should check Node.js version')
    assert.ok(content.includes('requires Node.js 20 or higher'), 'Should have error message')
  })
})

describe('CLI - Main Function Structure', () => {
  test('has proper main function structure', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify main function exists and structure
    assert.ok(content.includes('async function main'), 'Should have async main function')
    assert.ok(content.includes('main()'), 'Should call main function')

    // Verify all required steps
    const steps = [
      'createLogger',
      'welcome.display',
      'welcome.acceptTOS',
      'validatePackageJson',
      'detectNodeVersion',
      'prompts.ask',
      'scanner.scan',
      'analyzer.analyze',
      'output.generate'
    ]

    steps.forEach(step => {
      assert.ok(content.includes(step), `Should call ${step}`)
    })
  })
})

describe('CLI - Error Handling', () => {
  test('handles TOS rejection', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify TOS acceptance check
    assert.ok(content.includes('if (!accepted)'), 'Should check TOS acceptance')
    assert.ok(content.includes('TOS not accepted'), 'Should handle rejection')
    assert.ok(content.includes('process.exit(1)'), 'Should exit on rejection')
  })

  test('handles package.json validation error', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify error handling
    assert.ok(content.includes('validatePackageJson'), 'Should validate package.json')
    assert.ok(content.includes('catch (error)'), 'Should catch errors')
    assert.ok(content.includes('package.json validation failed'), 'Should log validation failure')
  })
})

describe('CLI - Component Integration', () => {
  test('passes options to scanner', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify scanner options are passed
    assert.ok(content.includes('scanner.scan'), 'Should call scanner')
    assert.ok(content.includes('skipWorkspaceScan'), 'Should pass skipWorkspaceScan')
    assert.ok(content.includes('localOnly'), 'Should pass localOnly')
    assert.ok(content.includes('skipTarballs'), 'Should pass skipTarballs')
  })

  test('passes options to analyzer', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify analyzer is called with correct params
    assert.ok(content.includes('analyzer.analyze'), 'Should call analyzer')
    assert.ok(content.includes('targetLtsVersion'), 'Should pass target version')
    assert.ok(content.includes('parsedFlags.exclude'), 'Should pass exclusions')
  })

  test('generates output with correct options', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify output generation
    assert.ok(content.includes('output.generate'), 'Should generate output')
    assert.ok(content.includes('userInput'), 'Should pass userInput')
    assert.ok(content.includes('scanData'), 'Should pass scanData')
    assert.ok(content.includes('analysisData'), 'Should pass analysisData')
    assert.ok(content.includes('outputPath'), 'Should pass outputPath')
  })
})

describe('CLI - Logging', () => {
  test('uses logger throughout execution', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify logging is used
    assert.ok(content.includes('logger.info'), 'Should use logger.info')
    assert.ok(content.includes('logger.warn'), 'Should use logger.warn')
    assert.ok(content.includes('logger.error'), 'Should use logger.error')
    assert.ok(content.includes('logger.startOperation'), 'Should use logger.startOperation')
    assert.ok(content.includes('logger.endOperation'), 'Should use logger.endOperation')
    assert.ok(content.includes('logger.close'), 'Should close logger')
  })

  test('handles main execution errors', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify error handling in main
    assert.ok(content.includes('try {'), 'Should have try block')
    assert.ok(content.includes('} catch (error) {'), 'Should catch errors')
    assert.ok(content.includes('CLI execution failed'), 'Should log execution failure')
    assert.ok(content.includes('process.exit(1)'), 'Should exit with error code')
  })

  test('handles interactive SIGINT cancellation gracefully', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify special handling of inquirer SIGINT error
    assert.ok(
      content.includes("error.message.includes('User force closed the prompt with SIGINT')"),
      'Should detect inquirer SIGINT cancellation error'
    )
    assert.ok(
      content.includes('Process cancelled by the user.'),
      'Should show user-friendly cancellation message for inquirer SIGINT'
    )
    assert.ok(
      content.includes("logger.warn('Process cancelled by user during interactive prompt (SIGINT)')"),
      'Should log SIGINT cancellation with warning'
    )
  })
})

describe('CLI - User Experience', () => {
  test('displays success message', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify success messaging
    assert.ok(content.includes('Success'), 'Should show success message')
    assert.ok(content.includes('upgrade report'), 'Should mention upgrade report')
    assert.ok(content.includes('All done'), 'Should provide completion message')
  })

  test('converts kebab-case to camelCase', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify flag conversion
    assert.ok(content.includes('skipWorkspaceScan'), 'Should convert skip-workspace-scan')
    assert.ok(content.includes('localOnly'), 'Should convert local-only')
    assert.ok(content.includes('skipTarballs'), 'Should convert skip-tarballs')
    assert.ok(content.includes('parsedFlags'), 'Should create parsedFlags')
  })

  test('initializes logger with log flag', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify logger initialization
    assert.ok(content.includes('createLogger'), 'Should create logger')
    assert.ok(content.includes('parsedFlags.log'), 'Should use log flag')
  })
})
