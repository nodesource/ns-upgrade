const { CI_SYSTEMS } = require('../constants')

/**
 * Process raw answers from prompts into final structured output
 * @param {Object} answers - Raw answers from inquirer
 * @param {Object} detectedNodeInfo - Detected Node version info from scanner
 * @param {string} detectedNodeInfo.version - Detected version
 * @param {string|null} detectedNodeInfo.versionManager - Detected version manager
 * @returns {Object} Processed answers
 */
function processAnswers (answers, detectedNodeInfo = {}) {
  // User's selected version (either from list or custom input)
  const selectedVersion = answers.currentNodeVersionCustom || answers.currentNodeVersion

  return {
    currentNodeVersion: {
      detected: detectedNodeInfo.version || 'unknown',
      selected: selectedVersion,
      versionManager: detectedNodeInfo.versionManager || null
    },
    targetLtsVersion: answers.targetLtsVersion,
    productionOS: answers.productionOSCustom
      ? answers.productionOS.map(os => os === 'Other' ? answers.productionOSCustom : os)
      : answers.productionOS,
    developmentOS: answers.developmentOSCustom
      ? answers.developmentOS.map(os => os === 'Other' ? answers.developmentOSCustom : os)
      : answers.developmentOS,
    ciEnvironment: CI_SYSTEMS[answers.ciEnvironment],
    additionalNotes: answers.additionalNotes.trim()
  }
}

module.exports = {
  processAnswers
}
