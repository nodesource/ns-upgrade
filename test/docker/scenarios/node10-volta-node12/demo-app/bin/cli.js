#!/usr/bin/env node

const { program } = require('commander')
const chalk = require('chalk')
const ora = require('ora')
const localHelpers = require('local-helpers')

program
  .version('1.0.0')
  .description('Demo CLI tool for testing ns-upgrade')

program
  .command('greet <name>')
  .description('Greet someone')
  .action((name) => {
    console.log(chalk.green(`Hello, ${name}!`))
    console.log(localHelpers.formatOutput(`Greeting ${name}`, 'success'))
  })

program
  .command('process')
  .description('Simulate processing')
  .action(() => {
    const spinner = ora('Processing...').start()

    setTimeout(() => {
      spinner.succeed('Processing complete!')
      console.log(localHelpers.calculate(10, 5, 'add'))
    }, 1000)
  })

program
  .command('info')
  .description('Show system information')
  .action(() => {
    console.log(chalk.cyan('System Information:'))
    console.log(`  Node.js: ${process.version}`)
    console.log(`  Platform: ${process.platform}`)
    console.log(`  Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`)
  })

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
