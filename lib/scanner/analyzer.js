const { ESLint } = require('eslint')
const { glob } = require('glob')
const { DEFAULT_EXCLUSIONS } = require('../constants')
const pluginN = require('eslint-plugin-n')
const tsParser = require('@typescript-eslint/parser')

let ora

/**
 * Build ESLint configuration based on target Node.js version
 * @param {string} targetVersion - Target Node.js version (e.g., "20", "22", "24")
 * @returns {Object} ESLint configuration
 */
function buildEslintConfig (targetVersion) {
  const baseConfig = {
    plugins: {
      n: pluginN
    },
    settings: {
      node: {
        version: targetVersion
      }
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Node.js globals
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    rules: {
      'n/no-unsupported-features/es-syntax': ['error', { version: targetVersion }],
      'n/no-deprecated-api': 'error',
      'no-restricted-modules': ['error', {
        paths: [
          {
            name: 'querystring',
            message: 'The querystring API is considered Legacy. New code should use the URLSearchParams API instead.'
          },
          {
            name: 'sys',
            message: 'The sys module is deprecated. Use util instead.'
          },
          {
            name: 'punycode',
            message: 'The punycode module is deprecated. Use a userland alternative instead.'
          }
        ]
      }],
      'no-restricted-properties': ['error', {
        object: 'util',
        property: 'inherits',
        message: 'util.inherits is deprecated. Use ES6 classes and extends instead.'
      }, {
        object: 'process',
        property: 'binding',
        message: 'process.binding() is deprecated. Use public APIs instead.'
      }, {
        object: 'fs',
        property: 'exists',
        message: 'fs.exists is deprecated. Use fs.stat or fs.access instead.'
      }, {
        object: 'url',
        property: 'parse',
        message: 'url.parse is deprecated. Use the WHATWG URL API instead.'
      }, {
        object: 'util',
        property: '_extend',
        message: 'util._extend is deprecated. Use Object.assign instead.'
      }, ...['isArray', 'isBoolean', 'isBuffer', 'isDate', 'isError', 'isFunction', 'isNull', 'isNullOrUndefined', 'isNumber', 'isObject', 'isPrimitive', 'isRegExp', 'isString', 'isSymbol', 'isUndefined'].map(method => ({
        object: 'util',
        property: method,
        message: `util.${method} is deprecated. Use explicit checks or other alternatives.`
      }))],
      'no-restricted-syntax': ['error', {
        selector: 'VariableDeclarator[init.callee.name="require"][init.arguments.0.value="util"] > ObjectPattern > Property[key.name="inherits"]',
        message: 'util.inherits is deprecated. Use ES6 classes and extends instead.'
      }]
    },
    linterOptions: {
      noInlineConfig: true
    }
  }

  // TypeScript configuration
  const tsConfig = {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    plugins: {
      n: pluginN
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: baseConfig.languageOptions.globals
    },
    rules: baseConfig.rules,
    linterOptions: {
      noInlineConfig: true
    }
  }

  return {
    overrideConfigFile: true,
    overrideConfig: [baseConfig, tsConfig],
    // Prevent ESLint from reading the target project's .eslintignore file
    // (deprecated in ESLint 9) - we handle file discovery with glob
    ignore: false,
    warnIgnored: false,
    // Don't throw errors when files we provide are ignored by ESLint's internal logic
    errorOnUnmatchedPattern: false
  }
}

/**
 * Build glob options with exclusions
 * @param {Array<string>} customExclusions - Custom exclusion patterns
 * @returns {Object} Glob options
 */
function buildGlobOptions (customExclusions = []) {
  const exclusions = [...DEFAULT_EXCLUSIONS, ...customExclusions]
  const ignore = exclusions.map(pattern => `**/${pattern}/**`)

  return {
    ignore
  }
}

/**
 * Discover JavaScript and TypeScript files to analyze
 * @param {Array<string>} customExclusions - Custom exclusion patterns
 * @returns {Promise<Array<string>>} Found JavaScript and TypeScript files
 */
async function discoverFiles (customExclusions = []) {
  const options = buildGlobOptions(customExclusions)

  try {
    const files = await glob('**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}', options)
    return files
  } catch (error) {
    return []
  }
}

/**
 * Run ESLint analysis with timeout
 * @param {Array<string>} files - Files to analyze
 * @param {Object} eslintConfig - ESLint configuration
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5 minutes)
 * @returns {Promise<Object>} Analysis results
 */
async function runAnalysis (files, eslintConfig, timeoutMs = 5 * 60 * 1000) {
  return new Promise((resolve) => {
    const timeoutHandle = setTimeout(() => {
      resolve({
        status: 'timeout',
        error: 'Static analysis timed out after 5 minutes.',
        findings: []
      })
    }, timeoutMs)

    analyzeWithEslint(files, eslintConfig)
      .then((result) => {
        clearTimeout(timeoutHandle)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutHandle)
        resolve({
          status: 'failed',
          error: error.message,
          findings: []
        })
      })
  })
}

/**
 * Run ESLint on files and collect findings
 * @param {Array<string>} files - Files to analyze
 * @param {Object} eslintConfig - ESLint configuration
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeWithEslint (files, eslintConfig) {
  // Temporarily suppress ESLint's .eslintignore deprecation warning
  // This is a Node.js process warning emitted by ESLint 9 when it detects
  // the deprecated .eslintignore file in the target project
  const originalEmitWarning = process.emitWarning
  process.emitWarning = (warning, ...args) => {
    // Filter out ESLintIgnoreWarning about .eslintignore deprecation
    if (typeof warning === 'string' && warning.includes('.eslintignore')) {
      return
    }
    if (warning && warning.name === 'ESLintIgnoreWarning') {
      return
    }
    originalEmitWarning.call(process, warning, ...args)
  }

  try {
    const eslint = new ESLint(eslintConfig)
    const results = await eslint.lintFiles(files)

    const findings = []

    for (const result of results) {
      // Check for fatal parsing errors first
      for (const message of result.messages) {
        if (message.fatal) {
          // Log parsing errors for debugging but continue analysis
          console.error(`Parse error in ${result.filePath}:${message.line}: ${message.message}`)
          continue
        }
        // Filter for deprecated API, unsupported features, and restricted syntax
        if (message.ruleId && (
          message.ruleId.includes('deprecated') ||
          message.ruleId.includes('unsupported') ||
          message.ruleId.includes('restricted')
        )) {
          findings.push({
            api: message.message,
            file: result.filePath,
            line: message.line
          })
        }
      }
    }

    return {
      status: 'success',
      error: null,
      findings
    }
  } catch (error) {
    // Provide more context for debugging
    const errorDetails = error.stack || error.message
    return {
      status: 'failed',
      error: errorDetails,
      findings: []
    }
  } finally {
    // Restore original emitWarning
    process.emitWarning = originalEmitWarning
  }
}

/**
 * Main analyze function
 * @param {string} targetLtsVersion - Target Node.js LTS version
 * @param {Array<string>} customExclusions - Custom exclusion patterns
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Analysis results with status, error, and findings
 */
async function analyze (targetLtsVersion, customExclusions = [], logger) {
  const log = logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
  let spinner
  try {
    // Dynamically import ora (ESM module)
    if (!ora) {
      ora = (await import('ora')).default
    }
    spinner = ora('Analyzing code for deprecated APIs...').start()
    log.debug('Starting static analysis', { targetLtsVersion, exclusionsCount: customExclusions.length })

    // Discover JavaScript files
    log.debug('Discovering JavaScript files')
    const files = await discoverFiles(customExclusions)
    log.info('JavaScript files discovered', { count: files.length })

    if (files.length === 0) {
      spinner.succeed('No JavaScript files found to analyze.')
      log.info('No JavaScript files found to analyze')
      return {
        status: 'success',
        error: null,
        findings: []
      }
    }

    // Build ESLint configuration
    log.debug('Building ESLint configuration', { targetLtsVersion })
    const eslintConfig = buildEslintConfig(targetLtsVersion)
    log.debug('ESLint configuration built')

    // Run analysis with timeout
    log.info('Running ESLint analysis with 5-minute timeout')
    const results = await runAnalysis(files, eslintConfig)
    log.info('Analysis completed', { status: results.status, findingsCount: results.findings.length })

    if (results.status === 'success') {
      spinner.succeed(`Analysis complete. Found ${results.findings.length} issue(s).`)
      log.debug('Analysis findings', { findings: results.findings.slice(0, 10) }) // Log first 10 findings
    } else if (results.status === 'timeout') {
      spinner.warn('Analysis timed out after 5 minutes.')
      log.warn('Analysis timed out', { timeoutMs: 300000 })
    } else {
      spinner.fail('Analysis failed.')
      log.error('Analysis failed', { error: results.error })
      // Print error details to help debugging
      if (results.error) {
        console.error('Analysis error:', results.error)
      }
    }

    return results
  } catch (error) {
    if (spinner) {
      spinner.fail('Analysis failed.')
    }
    log.error('Analysis error', error)
    console.error('Analysis error:', error)
    return {
      status: 'failed',
      error: error.message,
      findings: []
    }
  }
}

module.exports = {
  analyze,
  discoverFiles,
  buildEslintConfig,
  runAnalysis
}
