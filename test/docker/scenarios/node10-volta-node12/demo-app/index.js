const chalk = require('chalk')
const figlet = require('figlet')
const localHelpers = require('local-helpers')

console.log(chalk.blue(figlet.textSync('Demo CLI', { horizontalLayout: 'full' })))
console.log('')

console.log(chalk.green('=== CLI Tool Demo ==='))
console.log(chalk.cyan(`Node.js version: ${process.version}`))
console.log(chalk.cyan(`Platform: ${process.platform}`))
console.log(chalk.cyan(`Architecture: ${process.arch}`))
console.log('')

console.log(chalk.yellow('📦 Package Information:'))
const pkg = require('./package.json')
console.log(`  Name: ${pkg.name}`)
console.log(`  Version: ${pkg.version}`)
console.log(`  Description: ${pkg.description}`)
console.log('')

console.log(chalk.magenta('🔧 Local Helper Test:'))
const result = localHelpers.formatOutput('Hello from Volta test!', 'info')
console.log(result)
console.log('')

console.log(chalk.green('✅ CLI tool initialized successfully'))

module.exports = { pkg }
