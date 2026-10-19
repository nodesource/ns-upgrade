const http = require('node:http')
const net = require('node:net')
const { spawn } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const { ACCOUNTS_URL } = require('./constants')
// NodeSource wordmark, inlined so the callback page is fully self-contained
// (no runtime file read, works under the callback page CSP).
const NS_LOGO_SVG = '<svg width="231" height="39" viewBox="0 0 231 39" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="m26.644 5.872-6.01-3.47h-.002a3.856 3.856 0 0 0-1.934-.532c-.66 0-1.32.178-1.934.533L10.75 5.872l.001.001-6.008 3.468a3.858 3.858 0 0 0-1.429 1.413 3.854 3.854 0 0 0-.51 1.94v13.878c0 .704.178 1.363.51 1.94a3.858 3.858 0 0 0 1.43 1.412l6.007 3.468v.002l6.012 3.469a3.857 3.857 0 0 0 1.934.533c.66 0 1.319-.178 1.934-.533l6.012-3.47 6.007-3.469a3.859 3.859 0 0 0 1.43-1.412c.332-.577.51-1.236.51-1.94V12.694c0-.704-.178-1.364-.51-1.94a3.858 3.858 0 0 0-1.43-1.413l-6.008-3.468.001-.001zm-6.686-2.301 6.01 3.47 6.012 3.468c.232.135.436.296.607.479l-7.144 4.09c-.294-.44-.63-.85-1.001-1.223a8.073 8.073 0 0 0-5.744-2.393 8.074 8.074 0 0 0-5.744 2.393 8.198 8.198 0 0 0-.983 1.196l-7.114-4.114c.16-.162.348-.306.559-.428l12.022-6.938-.001-.002c.18-.103.365-.183.554-.24V9.348a.697.697 0 0 0 .207.486.71.71 0 0 0 1 0 .699.699 0 0 0 .206-.486V3.328c.19.057.375.138.555.241l-.001.002zm-15.74 8.552c-.04.182-.06.373-.06.57v13.879c0 .223.026.438.075.64l5.25-3.048.008-.005a.69.69 0 0 1 .522-.063.72.72 0 0 1 .5.87.695.695 0 0 1-.316.424l-.007.004-5.227 3.035c.136.122.287.231.453.327l12.022 6.939-.001.001c.184.106.373.188.567.245l.006-8.166a8.076 8.076 0 0 1-5.056-2.365 8.17 8.17 0 0 1-2.38-5.777c0-1.216.265-2.37.738-3.407l-7.095-4.103zm15.146 23.826c.203-.058.402-.142.595-.253l-.001-.001 12.022-6.94c.166-.095.317-.204.452-.326l-5.226-3.035-.008-.004a.697.697 0 0 1-.315-.423.719.719 0 0 1 .5-.87.688.688 0 0 1 .522.062l.007.005 5.25 3.048c.05-.203.075-.417.075-.64V12.694c0-.173-.015-.34-.045-.502l-7.095 4.064a8.181 8.181 0 0 1 .724 3.377c0 2.256-.91 4.299-2.38 5.777a8.077 8.077 0 0 1-5.07 2.366l-.006 8.173zm-6.847-19.027 5.5 3.181-.005 6.276a6.705 6.705 0 0 1-4.08-1.952 6.78 6.78 0 0 1-1.975-4.794c0-.964.2-1.88.56-2.71zm.656-1.176c.226-.324.48-.628.758-.908a6.7 6.7 0 0 1 4.767-1.986 6.7 6.7 0 0 1 4.766 1.986c.285.286.544.598.774.93l-5.54 3.173-5.525-3.195zm11.716 1.201-5.511 3.156-.006 6.277a6.704 6.704 0 0 0 4.092-1.953 6.78 6.78 0 0 0 1.975-4.794c0-.954-.196-1.863-.55-2.686z" fill="#5AC878"></path><path d="M56.99 11.537v15.925a1.046 1.046 0 0 1-.693.98 1.024 1.024 0 0 1-1.147-.335L44.513 14.533v12.93c0 .275-.109.54-.302.735a1.028 1.028 0 0 1-1.46 0 1.045 1.045 0 0 1-.302-.736V11.537a1.033 1.033 0 0 1 1.321-1c.206.061.388.185.521.355l10.635 13.574V11.537c0-.276.109-.54.303-.736a1.027 1.027 0 0 1 1.46 0c.193.195.301.46.301.736zm21.176 7.962c0 5.155-3.944 9.35-8.79 9.35-4.847 0-8.791-4.195-8.791-9.35 0-5.155 3.944-9.349 8.79-9.349 4.847 0 8.79 4.195 8.79 9.35zm-2.064 0c0-4.007-3.018-7.268-6.727-7.268-3.71 0-6.727 3.26-6.727 7.268s3.017 7.268 6.727 7.268c3.71 0 6.727-3.26 6.727-7.268zm72.696 0c0 5.155-3.945 9.35-8.791 9.35s-8.79-4.195-8.79-9.35c0-5.155 3.943-9.349 8.79-9.349 4.847 0 8.791 4.195 8.791 9.35zm-2.065 0c0-4.007-3.017-7.268-6.727-7.268-3.71 0-6.727 3.26-6.727 7.268s3.018 7.268 6.727 7.268c3.709 0 6.727-3.26 6.727-7.268zm18.961-9.002c-.274 0-.536.11-.73.304-.193.195-.302.46-.302.736v9.729a5.343 5.343 0 0 1-1.472 3.879 5.258 5.258 0 0 1-3.792 1.624 5.234 5.234 0 0 1-3.791-1.624 5.306 5.306 0 0 1-1.128-1.789 5.362 5.362 0 0 1-.345-2.09v-9.729c0-.276-.108-.54-.302-.736a1.027 1.027 0 0 0-1.459 0c-.194.195-.303.46-.303.736v9.729a7.435 7.435 0 0 0 2.082 5.342 7.33 7.33 0 0 0 2.4 1.65 7.275 7.275 0 0 0 5.693 0 7.33 7.33 0 0 0 2.4-1.65 7.386 7.386 0 0 0 1.576-2.459 7.452 7.452 0 0 0 .505-2.883v-9.729c0-.276-.109-.54-.302-.736a1.028 1.028 0 0 0-.73-.305zm-37.248 11.912a4.677 4.677 0 0 0-1.387-2.03 7.557 7.557 0 0 0-1.921-1.19c-.659-.29-1.341-.522-2.039-.692-.37-.101-.637-.145-1-.228-.306-.064-.61-.128-.905-.207a9.705 9.705 0 0 1-1.663-.574 3.812 3.812 0 0 1-1.226-.855 2.06 2.06 0 0 1-.338-.531 2.096 2.096 0 0 1-.163-.57 2.46 2.46 0 0 1 .111-1.275c.149-.408.403-.768.737-1.043a4.463 4.463 0 0 1 2.36-.929 7.124 7.124 0 0 1 2.337.095c.596.13 1.174.33 1.725.593.362.173.714.367 1.053.581.11.064.218.142.282.184l.1.068.01.006a.924.924 0 0 0 1.296-.223.944.944 0 0 0-.221-1.307l-.39-.296a9.772 9.772 0 0 0-1.244-.787 8.626 8.626 0 0 0-5.177-.983 6.467 6.467 0 0 0-3.468 1.412 4.58 4.58 0 0 0-1.301 1.82c-.072.18-.119.372-.176.56a8.65 8.65 0 0 0-.099.58l-.018.292-.007.147-.004.073.004.114.012.231c.002.09.01.18.023.27a4.194 4.194 0 0 0 1.012 2.294 5.817 5.817 0 0 0 1.898 1.36 11.65 11.65 0 0 0 2.023.705c.339.09.676.162 1.012.232.276.064.658.134.921.21a7.682 7.682 0 0 1 3.087 1.428c.364.28.635.664.779 1.102.143.438.152.909.026 1.352a2.35 2.35 0 0 1-.222.548 1.427 1.427 0 0 1-.172.268c-.061.088-.13.171-.206.247a3.517 3.517 0 0 1-1.101.765 6.599 6.599 0 0 1-2.676.538 5.811 5.811 0 0 1-1.193-.106 7.165 7.165 0 0 1-1.079-.3 9.676 9.676 0 0 1-1.708-.792 10.778 10.778 0 0 1-1.361-.922.923.923 0 0 0-1.296.079.938.938 0 0 0 .05 1.308l.025.024s.135.128.397.345a11.35 11.35 0 0 0 3.197 1.879c.446.169.905.303 1.372.402a7.808 7.808 0 0 0 1.615.168 8.617 8.617 0 0 0 3.517-.726 4.872 4.872 0 0 0 1.822-1.319 4.928 4.928 0 0 0 1.045-2.002l.037-.16.017-.116.033-.231.009-.058.01-.095v-.038l.005-.15.007-.304c0-.204-.034-.413-.055-.62a6.127 6.127 0 0 0-.15-.621zm-32.016-2.91c0 5.722-3.668 9.004-10.056 9.004h-3.662c-.274 0-.536-.11-.73-.305a1.045 1.045 0 0 1-.302-.736V11.537c0-.276.109-.54.302-.736.194-.195.456-.305.73-.305h3.662c6.945 0 10.056 4.522 10.056 9.003zm-2.065 0c0-4.204-3.137-6.922-7.992-6.922h-2.63v13.845h2.63c6.606 0 7.992-3.765 7.992-6.923zm17.182-6.922c.273 0 .536-.11.729-.304a1.044 1.044 0 0 0 0-1.472 1.026 1.026 0 0 0-.729-.305h-10.548a1.03 1.03 0 0 0-.953.643 1.043 1.043 0 0 0-.079.398v15.925c0 .276.109.54.303.736.193.195.456.305.729.305h10.55c.274 0 .536-.11.73-.305a1.047 1.047 0 0 0 0-1.472 1.028 1.028 0 0 0-.73-.304h-9.518V20.5h6.684c.273 0 .536-.11.729-.305a1.043 1.043 0 0 0-.729-1.776h-6.686v-5.843h9.518zm106.806 0c.274 0 .536-.11.73-.304a1.047 1.047 0 0 0 0-1.472 1.028 1.028 0 0 0-.73-.305h-10.55a1.022 1.022 0 0 0-.73.305 1.041 1.041 0 0 0-.302.736v15.925c0 .276.108.54.302.736.193.195.456.305.73.305h10.55c.274 0 .536-.11.73-.305a1.047 1.047 0 0 0 0-1.472 1.028 1.028 0 0 0-.73-.304h-9.518V20.5h6.687c.274 0 .537-.11.73-.305.194-.195.302-.46.302-.736 0-.276-.108-.54-.302-.735a1.027 1.027 0 0 0-.73-.305h-6.687v-5.843h9.518zm-34.066 14.285a1.046 1.046 0 0 1-.248 1.45 1.032 1.032 0 0 1-.771.175 1.027 1.027 0 0 1-.668-.425l-5.299-7.568h-4.581v6.968c0 .276-.109.54-.302.736a1.029 1.029 0 0 1-1.46 0 1.047 1.047 0 0 1-.302-.736V11.537c0-.276.109-.54.302-.736.194-.195.456-.305.73-.305h7.326c3.119 0 5.382 2.104 5.382 4.999 0 2.648-1.897 4.627-4.602 4.948l4.493 6.42zm-5.274-8.45c1.954 0 3.318-1.199 3.318-2.917 0-1.718-1.364-2.918-3.318-2.918h-6.293v5.836h6.293zm10.164.244c.048-.244.063-.478.126-.732.115-.511.284-1.01.506-1.484a7.336 7.336 0 0 1 1.814-2.428 7.12 7.12 0 0 1 2.45-1.408 7.64 7.64 0 0 1 2.513-.368 7.43 7.43 0 0 1 3.62 1.063c.309.184.605.39.886.616l.292.25.048.04a.922.922 0 0 0 1.282-.1.938.938 0 0 0-.047-1.296l-.349-.334a9.389 9.389 0 0 0-1.075-.842 8.897 8.897 0 0 0-4.61-1.473 9.52 9.52 0 0 0-3.214.47 9.184 9.184 0 0 0-3.152 1.811 9.426 9.426 0 0 0-2.98 5.033c-.079.332-.117.701-.171 1.054-.02.171-.018.308-.029.463l-.024.506a9.419 9.419 0 0 0 1.761 5.468 9.3 9.3 0 0 0 4.595 3.403c.547.181 1.11.31 1.681.383.254.04.51.064.767.07l.348.017.14.005.096-.003.19-.006a8.862 8.862 0 0 0 4.602-1.474 9.499 9.499 0 0 0 1.088-.854l.316-.307a.941.941 0 0 0 .046-1.301.923.923 0 0 0-1.288-.09l-.009.007-.323.276c-.277.22-.569.422-.873.604a7.39 7.39 0 0 1-3.628 1.063h-.256l-.347-.018a3.932 3.932 0 0 1-.658-.063 7.195 7.195 0 0 1-1.245-.292 7.118 7.118 0 0 1-2.449-1.409 7.289 7.289 0 0 1-1.835-2.471 7.34 7.34 0 0 1-.657-3.015l.021-.401c.014-.137.014-.304.032-.433h-.001zM226.709 12.706a4.451 4.451 0 0 1-1.668-.311 4.569 4.569 0 0 1-1.379-.912 4.484 4.484 0 0 1-.911-1.4 4.737 4.737 0 0 1-.334-1.802c0-.652.111-1.252.334-1.8a4.076 4.076 0 0 1 2.29-2.312 4.19 4.19 0 0 1 1.668-.335c.593 0 1.148.111 1.667.334.519.207.971.511 1.357.911.4.386.711.853.933 1.401.223.549.334 1.15.334 1.801 0 .653-.111 1.253-.334 1.801-.222.534-.533 1.001-.933 1.401-.386.386-.838.69-1.357.912a4.446 4.446 0 0 1-1.667.311zm0-.956c.459 0 .889-.082 1.289-.245.4-.177.741-.415 1.023-.711.297-.311.526-.675.689-1.09.163-.43.245-.904.245-1.423 0-.518-.082-.993-.245-1.423-.163-.43-.392-.8-.689-1.111a2.773 2.773 0 0 0-1.023-.712c-.4-.178-.83-.267-1.289-.267-.475 0-.912.09-1.312.267-.386.163-.727.4-1.023.712a3.465 3.465 0 0 0-.667 1.111c-.163.43-.245.905-.245 1.423 0 .52.082.994.245 1.423.163.415.385.779.667 1.09.296.296.637.534 1.023.711.4.163.837.245 1.312.245zm-1.713-1.312V6.013h1.846c.489 0 .904.112 1.245.334.356.222.534.593.534 1.112 0 .252-.074.489-.223.711a1.279 1.279 0 0 1-.6.512l.978 1.756h-1.178l-.734-1.445h-.756v1.445h-1.112zm1.112-2.246h.512c.252 0 .452-.059.6-.177a.593.593 0 0 0 .222-.49.593.593 0 0 0-.2-.467c-.118-.133-.318-.2-.6-.2h-.534v1.334z" fill="#F5F7F7"></path></svg>'

const DEFAULT_PORT_RANGE = [8765, 8770]
// 10 minutes: leaves room for creating and verifying a NodeSource account
// before signing in, matching the guidance shown on timeout.
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

function authError (reason, message) {
  const error = new Error(message)
  error.reason = reason
  return error
}

function buildSignInUrl (accountsUrl, port, state) {
  const url = new URL('/sign-in', accountsUrl)
  url.searchParams.set('extension', 'nsolid-plugin')
  url.searchParams.set('port', String(port))
  url.searchParams.set('state', state)
  return url.toString()
}

function isPortAvailable (port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
    tester.once('error', () => resolve(false))
    tester.listen(port, '127.0.0.1', () => {
      tester.close(() => resolve(true))
    })
  })
}

async function findAvailablePort (startPort, maxPort) {
  for (let port = startPort; port <= maxPort; port++) {
    if (await isPortAvailable(port)) return port
  }
  return null
}

function renderPage (title, message, variant = 'neutral') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>NodeSource · ${title}</title>
<link rel="icon" href="https://nodesource.com/icon.ico">
<style>
  :root {
    --paper:#0f1613; --surface:#17211c; --ink:#e6ebe6; --mute:#9aa8a0; --faint:#6f7d76;
    --line:#2b3730; --accentInk:#7fd79c; --redInk:#f39a89; --radius:5px;
    --font:'Helvetica Neue',Helvetica,Arial,'Nimbus Sans','Liberation Sans',system-ui,sans-serif;
  }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; background:var(--paper); color:var(--ink); font-family:var(--font);
         display:flex; align-items:center; justify-content:center; padding:40px 24px; }
  .card { width:420px; background:var(--surface); border:1px solid var(--line); border-radius:var(--radius);
          padding:40px 36px 28px; text-align:center;
          box-shadow:0 1px 2px rgba(0,0,0,.4),0 14px 36px -14px rgba(0,0,0,.7); }
  .card svg { display:block; width:190px; height:auto; margin:0 auto 26px; }
  h1 { font-size:22px; font-weight:800; letter-spacing:-.01em; margin:0 0 10px; }
  .card.success h1 { color:var(--accentInk); }
  .card.error h1 { color:var(--redInk); }
  p { color:var(--mute); font-size:15px; line-height:1.55; margin:0; }
  footer { margin-top:28px; padding-top:16px; border-top:1px solid var(--line); color:var(--faint); font-size:12.5px; }
</style>
</head>
<body>
  <section class="card ${variant}">
    ${NS_LOGO_SVG}
    <h1>${title}</h1>
    <p>${message}</p>
    <footer>NodeSource · Node.js Upgrade Advisor</footer>
  </section>
</body>
</html>`
}

function defaultBrowserLauncher (url) {
  return new Promise((resolve) => {
    const platform = process.platform
    const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
    const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]
    try {
      const child = spawn(command, args, { stdio: 'ignore', detached: true })
      child.on('error', () => resolve())
      child.unref()
    } catch {
      // best effort: the sign-in URL is always printed to stderr
    }
    resolve()
  })
}

async function login (options = {}) {
  const accountsUrl = options.accountsUrl || process.env.NODESOURCE_ACCOUNTS_URL || ACCOUNTS_URL
  const [minPort, maxPort] = options.portRange || DEFAULT_PORT_RANGE
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS
  const stderr = options.stderr || ((text) => process.stderr.write(text))
  const browserLauncher = options.browserLauncher || defaultBrowserLauncher

  const state = randomUUID()

  let settled = false
  let timeoutId = null
  let resolveCallback = null
  let rejectCallback = null
  const callbackPromise = new Promise((resolve, reject) => {
    resolveCallback = resolve
    rejectCallback = reject
  })

  const respond = (res, status, title, message, variant) => {
    res.writeHead(status, {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      Connection: 'close'
    })
    res.end(renderPage(title, message, variant))
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    if (url.pathname !== '/callback') {
      respond(res, 404, 'Not found', 'Unknown callback path.', 'neutral')
      return
    }

    const receivedState = url.searchParams.get('state')
    if (receivedState !== state) {
      respond(res, 400, 'Authentication failed', 'Invalid state parameter.', 'error')
      return
    }

    const success = url.searchParams.get('success') === 'true'
    const token = url.searchParams.get('token')
    const consoleId = url.searchParams.get('consoleId')
    const saasToken = url.searchParams.get('NSOLID_SAAS')
    const consoleUrl = url.searchParams.get('url')

    if (!success || !token || !consoleId || !saasToken || !consoleUrl) {
      respond(res, 400, 'Authentication failed', 'Authentication was not successful.', 'error')
      if (!settled) {
        settled = true
        clearTimeout(timeoutId)
        rejectCallback(authError('auth-failed', 'Authentication failed'))
      }
      return
    }

    respond(res, 200, 'Authentication successful', 'You can close this window and return to the terminal.', 'success')
    if (!settled) {
      settled = true
      clearTimeout(timeoutId)
      resolveCallback({ token, consoleId, saasToken, consoleUrl })
    }
  })

  let port = await findAvailablePort(minPort, maxPort)
  while (port !== null) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => reject(error)
        server.once('error', onError)
        server.listen(port, '127.0.0.1', () => {
          server.removeListener('error', onError)
          resolve()
        })
      })
      break
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error
      port = await findAvailablePort(port + 1, maxPort)
    }
  }

  if (port === null) {
    throw authError('no-ports', `No available ports in range ${minPort}-${maxPort}`)
  }

  const signInUrl = buildSignInUrl(accountsUrl, port, state)
  stderr('\nNodeSource authentication started.\n')
  stderr('If a browser did not open automatically, open this sign-in URL manually:\n')
  stderr(`${signInUrl}\n\n`)
  stderr('New to NodeSource? Create your account and verify your email address, then open\n')
  stderr('this same link again to continue.\n\n')

  try {
    await browserLauncher(signInUrl)
  } catch {
    // best effort: the sign-in URL is already on stderr
  }

  timeoutId = setTimeout(() => {
    if (!settled) {
      settled = true
      rejectCallback(authError('timeout', 'Authentication timed out'))
    }
  }, timeoutMs)

  try {
    return await callbackPromise
  } finally {
    clearTimeout(timeoutId)
    await new Promise((resolve) => {
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections()
      server.close(() => resolve())
    })
  }
}

module.exports = { buildSignInUrl, login }
