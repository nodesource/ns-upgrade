/**
 * Display module for showing JSON content in a styled format
 */

const { cyan, green, yellow, gray, bold } = require('colorette')

/**
 * Display JSON content in a styled, readable format
 * @param {Object} jsonData - The JSON data to display
 * @param {Object} options - Display options
 * @param {number} options.maxDepth - Maximum depth to display (default: 3)
 * @param {number} options.indent - Indent level (default: 2)
 */
function displayJSON (jsonData, options = {}) {
  const { maxDepth = 3 } = options

  console.log('\n' + bold(cyan('━'.repeat(80))))
  console.log(bold(cyan('📄 Generated Report Summary')))
  console.log(bold(cyan('━'.repeat(80))) + '\n')

  // Display key sections
  displaySection('Schema Version', jsonData.schemaVersion)
  displaySection('Generated At', new Date(jsonData.generatedAt).toLocaleString())

  // Project Info
  if (jsonData.projectInfo) {
    console.log(bold(green('\n📦 Project Information:')))
    displayObject(jsonData.projectInfo, 1, maxDepth)
  }

  // Scanned Data Summary
  if (jsonData.scannedData) {
    console.log(bold(green('\n🔍 Scanned Data:')))
    const summary = {
      packageJsonFound: !!jsonData.scannedData.packageJson,
      lockfilesDetected: jsonData.scannedData.lockfilesDetected?.length || 0,
      workspacePackages: jsonData.scannedData.allPackageJsons?.length || 0,
      ciConfigsFound: jsonData.scannedData.ciConfigsFound?.length || 0,
      cppAddons: jsonData.scannedData.cppAddons?.gypFilesFound?.length || 0,
      monorepoConfigs: jsonData.scannedData.monorepoConfigs?.length || 0
    }
    displayObject(summary, 1, maxDepth)
  }

  // Static Analysis
  if (jsonData.staticApiAnalysis) {
    console.log(bold(green('\n🔬 Static Analysis:')))
    displayObject({
      status: jsonData.staticApiAnalysis.status,
      findings: jsonData.staticApiAnalysis.findings?.length || 0
    }, 1, maxDepth)
  }

  // Warnings
  if (jsonData.warnings && jsonData.warnings.length > 0) {
    console.log(bold(yellow('\n⚠️  Warnings:')))
    jsonData.warnings.forEach((warning, index) => {
      console.log(yellow(`  ${index + 1}. ${warning}`))
    })
  }

  // Additional Notes
  if (jsonData.additionalNotes) {
    console.log(bold(green('\n📝 Additional Notes:')))
    console.log(gray(`  ${jsonData.additionalNotes}`))
  }

  console.log('\n' + bold(cyan('━'.repeat(80))) + '\n')
}

/**
 * Display a simple key-value section
 * @param {string} label - Section label
 * @param {*} value - Section value
 */
function displaySection (label, value) {
  console.log(`${bold(label)}: ${cyan(String(value))}`)
}

/**
 * Display an object with indentation
 * @param {Object} obj - Object to display
 * @param {number} level - Current indentation level
 * @param {number} maxDepth - Maximum depth to display
 */
function displayObject (obj, level = 0, maxDepth = 3) {
  if (level > maxDepth) {
    console.log(gray('  '.repeat(level) + '[...]'))
    return
  }

  for (const [key, value] of Object.entries(obj)) {
    const indent = '  '.repeat(level)

    if (value === null || value === undefined) {
      console.log(`${indent}${gray(key)}: ${gray('null')}`)
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      console.log(`${indent}${green(key)}:`)
      displayObject(value, level + 1, maxDepth)
    } else if (Array.isArray(value)) {
      console.log(`${indent}${green(key)}: ${cyan(`[${value.length} items]`)}`)
    } else if (typeof value === 'boolean') {
      console.log(`${indent}${green(key)}: ${value ? green('true') : yellow('false')}`)
    } else if (typeof value === 'number') {
      console.log(`${indent}${green(key)}: ${cyan(value)}`)
    } else {
      console.log(`${indent}${green(key)}: ${cyan(value)}`)
    }
  }
}

module.exports = {
  displayJSON
}
