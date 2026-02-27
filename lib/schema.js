const { z } = require('zod')

// Define the complete Zod schema matching the PRD JSON structure
const discoverySchema = z.object({
  schemaVersion: z.string().default('1.2.0'),
  generatedAt: z.string().datetime(),
  projectInfo: z.object({
    currentNodeVersion: z.object({
      detected: z.string(),
      selected: z.string(),
      versionManager: z.string().nullable()
    }),
    targetLtsVersion: z.string(),
    packageManager: z.object({
      name: z.enum(['npm', 'yarn', 'pnpm', 'unknown']),
      version: z.string()
    }),
    environments: z.object({
      developmentOS: z.union([z.string(), z.array(z.string())]),
      productionOS: z.union([z.string(), z.array(z.string())]),
      ciEnvironment: z.enum(['github', 'jenkins', 'gitlab', 'circleci', 'travis', 'azure', 'aws', 'other', 'none'])
    }),
    hasWorkspaces: z.boolean(),
    monorepoTools: z.array(z.string()).optional().default([])
  }),
  scannedData: z.object({
    packageJson: z.object({
      content: z.any(),
      isTruncated: z.boolean()
    }),
    allPackageJsons: z.array(
      z.object({
        path: z.string(),
        content: z.any(),
        isTruncated: z.boolean(),
        isRoot: z.boolean()
      })
    ).optional().default([]),
    lockfile: z.object({
      name: z.string(),
      content: z.any(),
      isTruncated: z.boolean()
    }),
    lockfilesDetected: z.array(z.string()),
    ciConfigsFound: z.array(z.string()),
    cppAddons: z.object({
      gypFilesFound: z.array(
        z.union([
          z.object({
            path: z.string(),
            content: z.string(),
            parsed: z.any().nullable(),
            sources: z.array(z.string())
          }),
          z.object({
            path: z.string(),
            error: z.string()
          })
        ])
      ),
      cmakeListsFound: z.array(z.string()).optional().default([]),
      dependenciesFound: z.array(z.string())
    }),
    monorepoConfigs: z.array(
      z.object({
        name: z.string(),
        content: z.string()
      })
    ).optional().default([])
  }),
  staticApiAnalysis: z.object({
    status: z.enum(['success', 'failed', 'timeout']),
    error: z.union([z.string(), z.null()]),
    findings: z.array(
      z.object({
        api: z.string(),
        file: z.string(),
        line: z.number()
      })
    )
  }),
  warnings: z.array(z.string()),
  additionalNotes: z.string().max(500).optional()
})

/**
 * Validate data against the discovery schema
 * @param {Object} data - Data to validate
 * @returns {Object} Validated data
 * @throws {Error} If validation fails
 */
function validate (data) {
  try {
    return discoverySchema.parse(data)
  } catch (error) {
    throw new Error(`Schema validation failed: ${error.message}`)
  }
}

/**
 * Safely validate data without throwing
 * @param {Object} data - Data to validate
 * @returns {Object} { success, data, error }
 */
function validateSafe (data) {
  const result = discoverySchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data, error: null }
  }
  return { success: false, data: null, error: result.error.message }
}

module.exports = {
  discoverySchema,
  validate,
  validateSafe
}
