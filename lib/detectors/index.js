/**
 * Detectors module - Main entry point
 *
 * This module provides functions to detect:
 * - Node.js version (from version managers or system)
 * - Package manager (npm, yarn, pnpm)
 * - Lockfiles
 * - Package.json content
 * - Workspace configurations
 */

const { detectNodeVersion } = require('./node-version')
const { detectPackageManager } = require('./package-manager')
const { detectLockfiles, readLockfile } = require('./lockfiles')
const { readPackageJson } = require('./package-json')
const { detectWorkspaces } = require('./workspaces')

module.exports = {
  detectNodeVersion,
  detectPackageManager,
  detectLockfiles,
  readPackageJson,
  readLockfile,
  detectWorkspaces
}
