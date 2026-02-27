const fs = require('node:fs')
const path = require('node:path')

/**
 * Detect workspace configuration or internal packages
 * Checks for:
 * 1. Explicit workspaces field (npm/yarn/pnpm workspaces)
 * 2. Any custom dependency sources (file:, git:, http:, github shorthand)
 * 3. Monorepo configuration files (pnpm, lerna, nx, turbo, rush, bazel, yarn)
 * @param {Object} pkg - Parsed package.json
 * @param {Function} [detectCustomDependencyFn] - Optional function to detect custom dependencies
 * @param {string} [cwd] - Current working directory to check for config files
 * @returns {Object} { hasWorkspaces: boolean, tools: string[], configFiles: string[] }
 */
function detectWorkspaces (pkg, detectCustomDependencyFn, cwd = process.cwd()) {
  // Import detectCustomDependency if not provided (for backward compatibility)
  const detectCustomDep = detectCustomDependencyFn || require('../scanner/dependency-detection').detectCustomDependency

  const result = {
    hasWorkspaces: false,
    tools: [],
    configFiles: []
  }

  // Check for explicit workspaces field in package.json
  if (pkg.workspaces) {
    result.hasWorkspaces = true
    // If workspaces is present, it's likely npm or yarn (v1 or v2+)
    // We can't be 100% sure which one just from this, but it indicates workspaces.
    // We'll let the file checks add more specific tools.
  }

  // Check for monorepo config files
  const monorepoConfigs = [
    { file: 'pnpm-workspace.yaml', tool: 'pnpm' },
    { file: 'lerna.json', tool: 'lerna' },
    { file: 'nx.json', tool: 'nx' },
    { file: 'turbo.json', tool: 'turborepo' },
    { file: '.yarnrc.yml', tool: 'yarn' },
    { file: '.yarnrc', tool: 'yarn' }
  ]

  for (const config of monorepoConfigs) {
    if (fs.existsSync(path.join(cwd, config.file))) {
      result.hasWorkspaces = true
      if (!result.tools.includes(config.tool)) {
        result.tools.push(config.tool)
      }
      result.configFiles.push(config.file)
    }
  }

  // The original logic returned true immediately if pkg.workspaces was found.
  // But now we want to collect all tools and be exhaustive about custom dependencies too.

  // Check all dependency types for custom sources.
  // This implies "internal packages" usage even if no explicit workspace tool is found.
  // The original logic was: if (pkg.workspaces) return true; then check deps.
  // So if pkg.workspaces was true, it didn't check deps.
  // We should preserve that behavior for `hasWorkspaces` flag, but we might want to know about tools.
  // However, custom deps don't map to a specific "tool" in the list above, they just imply "hasWorkspaces" (or rather, local linking).

  if (!result.hasWorkspaces) {
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.optionalDependencies
    }

    // Detect any custom dependency sources
    for (const dep in allDeps) {
      const detection = detectCustomDep(allDeps[dep])
      if (detection && detection.isCustomSource) {
        result.hasWorkspaces = true
        break
      }
    }
  }

  return result
}

module.exports = { detectWorkspaces }
