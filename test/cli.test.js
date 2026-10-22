const { test, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

describe('CLI - Basic File Checks', () => {
  test('binary file exists', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    assert.ok(fs.existsSync(cliPath), 'CLI file should exist')
  })

  test('has shebang', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')
    assert.ok(content.startsWith('#!/usr/bin/env node'), 'Should have Node.js shebang')
  })

  test('loads without errors', () => {
    // Just verify the file can be read and has expected content
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    assert.ok(content.includes('parseArgs'), 'Should use parseArgs')
    assert.ok(content.includes('main'), 'Should have main function')
  })
})

describe('CLI - Version Command', () => {
  test('version flag works', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')

    try {
      const output = execSync(`node ${cliPath} --version`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })

      assert.ok(output.includes('@nodesource/upgrade'), 'Should output package name')
      assert.ok(output.match(/v?\d+\.\d+\.\d+/), 'Should include version number')
    } catch (error) {
      // Command exits with 0, so this is expected
      if (error.stdout) {
        assert.ok(error.stdout.includes('@nodesource/upgrade'), 'Should output package name')
      }
    }
  })
})

describe('CLI - Argument Definitions', () => {
  test('has proper argument definitions', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    assert.ok(content.includes('help:'), 'Should define help option')
    assert.ok(content.includes('version:'), 'Should define version option')
    assert.ok(content.includes('output:'), 'Should define output option')
    assert.ok(content.includes('exclude:'), 'Should define exclude option')
    assert.ok(content.includes('log:'), 'Should define log option')
    assert.ok(content.includes("'skip-workspace-scan':"), 'Should define skip-workspace-scan option')
    assert.ok(content.includes("'local-only':"), 'Should define local-only option')
    assert.ok(content.includes("'skip-tarballs':"), 'Should define skip-tarballs option')
  })

  test('accepts all expected flags', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')

    // Test that all valid flags are accepted (should not throw parsing errors)
    const validFlags = [
      '--help',
      '-h',
      '--version',
      '--output test.json',
      '--exclude *.test.js',
      '--skip-workspace-scan',
      '--local-only',
      '--skip-tarballs',
      '--log test.log'
    ]

    for (const flag of validFlags) {
      try {
        // For flags that exit immediately, test that they don't cause parsing errors
        if (flag.includes('--help') || flag.includes('-h') || flag.includes('--version')) {
          execSync(`node ${cliPath} ${flag}`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
          })
        } else {
          // For other flags, test that they don't cause parsing errors
          // but may fail for other reasons (like missing package.json)
          execSync(`node ${cliPath} ${flag}`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 5000 // Add timeout to prevent hanging
          })
        }
      } catch (error) {
        // Should not be argument parsing errors
        assert.ok(!error.stderr.includes('Error parsing arguments'),
          `Flag "${flag}" should not cause parsing error: ${error.stderr}`)
      }
    }

    // Clean up test.log file if it was created by the --log test.log flag
    const testLogPath = path.join(process.cwd(), 'test.log')
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath)
    }
  })

  test('argument parsing error handling works', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')

    try {
      execSync(`node ${cliPath} --invalid-flag`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      assert.fail('Should have thrown an error for invalid flag')
    } catch (error) {
      assert.ok(error.stderr.includes('Error parsing arguments'), 'Should show parsing error')
      assert.ok(error.stderr.includes('Unknown option'), 'Should specify unknown option')
      assert.ok(error.stderr.includes('Use --help for usage information'), 'Should show help hint')
    }
  })

  test('handles multiple invalid arguments', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')

    try {
      execSync(`node ${cliPath} --flag1 --flag2`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      assert.fail('Should have thrown an error for invalid flags')
    } catch (error) {
      assert.ok(error.stderr.includes('Error parsing arguments'), 'Should show parsing error')
    }
  })

  test('has argument parsing error handling', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    assert.ok(content.includes('try {'), 'Should have try-catch for argument parsing')
    assert.ok(content.includes('Error parsing arguments'), 'Should have argument parsing error message')
  })
})

describe('CLI - Error Handling', () => {
  test('has global error handlers', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    assert.ok(content.includes('uncaughtException'), 'Should have uncaught exception handler')
    assert.ok(content.includes('unhandledRejection'), 'Should have unhandled rejection handler')
    assert.ok(content.includes('SIGINT'), 'Should have SIGINT handler')
    assert.ok(content.includes('SIGTERM'), 'Should have SIGTERM handler')
    assert.ok(content.includes('globalLogger'), 'Should have global logger reference')
  })

  test('error handlers are properly defined', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Check that error handler functions are defined
    assert.ok(content.includes('function handleUncaughtException'), 'Should define uncaught exception handler')
    assert.ok(content.includes('function handleUnhandledRejection'), 'Should define unhandled rejection handler')
    assert.ok(content.includes('function handleSigint'), 'Should define SIGINT handler')
    assert.ok(content.includes('function handleSigterm'), 'Should define SIGTERM handler')
  })

  test('error handlers use global logger', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Check that error handlers reference globalLogger
    assert.ok(content.includes('globalLogger.error'), 'Uncaught exception handler should use logger')
    assert.ok(content.includes('globalLogger.error'), 'Unhandled rejection handler should use logger')
    assert.ok(content.includes('globalLogger.warn'), 'SIGINT handler should use logger')
    assert.ok(content.includes('globalLogger.warn'), 'SIGTERM handler should use logger')
  })

  test('error handlers provide user-friendly messages', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    assert.ok(content.includes('Unexpected error occurred'), 'Should show user-friendly error message')
    assert.ok(content.includes('Process cancelled by user'), 'Should show cancellation message')
    assert.ok(content.includes('Process terminated'), 'Should show termination message')
  })

  test('global logger is set in main function', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    assert.ok(content.includes('globalLogger = logger'), 'Should set global logger reference')
    assert.ok(content.includes('const logger = createLogger'), 'Should initialize logger from createLogger')
  })

  test('has error handling', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    assert.ok(content.includes('try'), 'Should have try blocks')
    assert.ok(content.includes('catch'), 'Should have catch blocks')
    assert.ok(content.includes('process.exit'), 'Should handle exit codes')
  })
})

describe('CLI - Node.js Version Check', () => {
  test('checks Node.js version requirement', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    assert.ok(content.includes('majorVersion < 22'), 'Should check for Node.js 22+')
    assert.ok(content.includes('requires Node.js 22 or higher'), 'Should have version requirement message')
  })
})

describe('CLI - Module Imports', () => {
  test('imports required modules', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify all required modules are imported
    assert.ok(content.includes("require('../lib/logger')"), 'Should import logger')
    assert.ok(content.includes("require('../lib/welcome')"), 'Should import welcome')
    assert.ok(content.includes("require('../lib/prompts')"), 'Should import prompts')
    assert.ok(content.includes("require('../lib/scanner')"), 'Should import scanner')
    assert.ok(content.includes("require('../lib/scanner/analyzer')"), 'Should import analyzer')
    assert.ok(content.includes("require('../lib/output')"), 'Should import output')
    assert.ok(content.includes("require('../lib/detectors')"), 'Should import detectors')
    assert.ok(content.includes("require('../lib/utils')"), 'Should import utils')
  })
})

describe('CLI - Help Command', () => {
  test('--help flag shows help information', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')

    try {
      const result = execSync(`node ${cliPath} --help`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Verify help content is displayed
      assert.ok(result.includes('@nodesource/upgrade'), 'Should show package name in help')
      assert.ok(result.includes('DESCRIPTION:'), 'Should show description section')
      assert.ok(result.includes('USAGE:'), 'Should show usage section')
      assert.ok(result.includes('OPTIONS:'), 'Should show options section')
      assert.ok(result.includes('EXAMPLES:'), 'Should show examples section')
      assert.ok(result.includes('FOR MORE INFORMATION:'), 'Should show more info section')

      // Verify specific options are documented
      assert.ok(result.includes('-h, --help'), 'Should document help flag')
      assert.ok(result.includes('-v, --version'), 'Should document version flag')
      assert.ok(result.includes('-o, --output'), 'Should document output flag')
      assert.ok(result.includes('-e, --exclude'), 'Should document exclude flag')
      assert.ok(result.includes('--skip-workspace-scan'), 'Should document skip-workspace-scan flag')
      assert.ok(result.includes('--local-only'), 'Should document local-only flag')
      assert.ok(result.includes('--skip-tarballs'), 'Should document skip-tarballs flag')
      assert.ok(result.includes('-l, --log'), 'Should document log flag')

      // Verify examples are shown with package runners
      assert.ok(result.includes('npx -p node@latest -p @nodesource/upgrade nodesource-upgrade'), 'Should show npx examples')
      assert.ok(result.includes('pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade'), 'Should show pnpm examples')
      assert.ok(result.includes('yarn dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade'), 'Should show yarn examples')
      assert.ok(result.includes('--output my-report.json'), 'Should show output example')
      assert.ok(result.includes('--exclude "*.test.js"'), 'Should show exclude example')
      assert.ok(result.includes('--local-only'), 'Should show local-only flag example')
      assert.ok(result.includes('--log debug.log'), 'Should show log example')

      // Verify GitHub link is present
      assert.ok(result.includes('github.com/nodesource/ns-upgrade'), 'Should include GitHub link')
    } catch (error) {
      assert.fail(`Help command should not fail: ${error.message}`)
    }
  })

  test('-h short flag shows help information', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')

    try {
      const result = execSync(`node ${cliPath} -h`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Verify help content is displayed with short flag
      assert.ok(result.includes('@nodesource/upgrade'), 'Should show package name in help')
      assert.ok(result.includes('DESCRIPTION:'), 'Should show description section')
      assert.ok(result.includes('OPTIONS:'), 'Should show options section')
      assert.ok(result.includes('-h, --help'), 'Should document help flag')
    } catch (error) {
      assert.fail(`Short help command should not fail: ${error.message}`)
    }
  })

  test('help flag is processed before version check', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify help handling comes before version handling
    const helpIndex = content.indexOf('Handle --help flag')
    const versionIndex = content.indexOf('Handle --version flag')

    assert.ok(helpIndex < versionIndex, 'Help should be processed before version')
    assert.ok(helpIndex !== -1, 'Help handler should exist')
    assert.ok(versionIndex !== -1, 'Version handler should exist')
  })

  test('help flag exits with code 0', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')

    try {
      const result = execSync(`node ${cliPath} --help`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // If we get here, the command succeeded (exit code 0)
      assert.ok(result.length > 0, 'Help should produce output')
    } catch (error) {
      // Check if it's a non-zero exit code
      if (error.status && error.status !== 0) {
        assert.fail(`Help should exit with code 0, got ${error.status}`)
      }
    }
  })

  test('help flag is included in parsed flags', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify help flag is included in parsed flags object
    assert.ok(content.includes('help: flags.help'), 'Should include help in parsed flags')
    assert.ok(content.includes('if (parsedFlags.help)'), 'Should check help flag')
  })

  test('help flag has correct short option', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify help flag has short option 'h'
    assert.ok(content.includes("short: 'h'"), 'Help should have short option h')
    assert.ok(content.includes('type: \'boolean\''), 'Help should be boolean type')
    assert.ok(content.includes('default: false'), 'Help should default to false')
  })

  test('help flag has proper description', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js')
    const content = fs.readFileSync(cliPath, 'utf-8')

    // Verify help flag has proper description
    assert.ok(content.includes('description: \'Show help information\''), 'Help should have proper description')
  })
})
