#!/usr/bin/env node

/**
 * Validation script for ns-upgrade Docker test scenarios
 * Validates the output JSON structure and content
 */

const fs = require('fs')

function validateOutput (filePath) {
  console.log('Validating output file:', filePath)

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Output file not found: ${filePath}`)
  }

  // Read and parse JSON
  let data
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    data = JSON.parse(content)
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`)
  }

  // Validate schema version
  if (!data.schemaVersion) {
    throw new Error('Missing schemaVersion in output')
  }
  console.log('✓ Schema version:', data.schemaVersion)

  // Validate project info
  if (!data.projectInfo) {
    throw new Error('Missing projectInfo in output')
  }

  if (!data.projectInfo.currentNodeVersion) {
    throw new Error('Missing currentNodeVersion in projectInfo')
  }
  if (!data.projectInfo.currentNodeVersion.detected || !data.projectInfo.currentNodeVersion.selected) {
    throw new Error('currentNodeVersion must have detected and selected fields')
  }
  console.log('✓ Current Node version (detected):', data.projectInfo.currentNodeVersion.detected)
  console.log('✓ Current Node version (selected):', data.projectInfo.currentNodeVersion.selected)
  if (data.projectInfo.currentNodeVersion.versionManager) {
    console.log('✓ Version manager:', data.projectInfo.currentNodeVersion.versionManager)
  }

  if (data.projectInfo.packageManager) {
    console.log('✓ Package manager:', data.projectInfo.packageManager.name)
  }

  // Validate scanned data
  if (!data.scannedData) {
    throw new Error('Missing scannedData in output')
  }
  console.log('✓ Scanned data present')

  // Check for package.json
  if (data.scannedData.packageJson) {
    console.log('✓ Package.json detected')
  }

  // Check for monorepo info
  if (data.projectInfo.monorepoTools && data.projectInfo.monorepoTools.length > 0) {
    console.log('✓ Monorepo tools detected:', data.projectInfo.monorepoTools.join(', '))
  }
  if (data.scannedData.monorepoConfigs && data.scannedData.monorepoConfigs.length > 0) {
    console.log('✓ Monorepo configs detected:', data.scannedData.monorepoConfigs.length)
  }

  // Check for dependencies
  const outputStr = JSON.stringify(data)
  const hasRegularDeps = outputStr.includes('dependencies')
  const hasLocalDeps = outputStr.includes('file:')
  const hasGitDeps = outputStr.includes('github:') || outputStr.includes('git+')

  console.log('\nDependency Detection:')
  console.log('  Regular dependencies:', hasRegularDeps ? '✓ Found' : '✗ Not found')
  console.log('  Local dependencies:', hasLocalDeps ? '✓ Found' : '✗ Not found')
  console.log('  Git dependencies:', hasGitDeps ? '✓ Found' : '✗ Not found')

  // Validate static analysis
  if (data.staticApiAnalysis) {
    console.log('\n✓ Static API analysis:', data.staticApiAnalysis.status)
  }

  // Check for warnings
  if (data.warnings) {
    console.log('✓ Warnings section present:', data.warnings.length, 'warning(s)')
  }

  return {
    valid: true,
    schemaVersion: data.schemaVersion,
    nodeVersion: data.projectInfo.currentNodeVersion.selected,
    detectedVersion: data.projectInfo.currentNodeVersion.detected,
    versionManager: data.projectInfo.currentNodeVersion.versionManager,
    hasRegularDeps,
    hasLocalDeps,
    hasGitDeps
  }
}

// Main execution
const filePath = process.argv[2]

if (!filePath) {
  console.error('Usage: node validate-output.js <path-to-discovery.json>')
  process.exit(1)
}

try {
  validateOutput(filePath)
  console.log('\n✅ Validation PASSED!')
  console.log('All required fields are present and valid.')
  process.exit(0)
} catch (error) {
  console.error('\n❌ Validation FAILED!')
  console.error('Error:', error.message)
  process.exit(1)
}
