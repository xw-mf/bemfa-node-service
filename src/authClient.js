const axios = require('axios')
const logger = require('./logger')

function pathGet(obj, path) {
  if (!path) return undefined
  return path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj)
}

class AuthClient {
  constructor(config) {
    this.config = config
    this.token = ''
    this.timer = null
  }

  async refresh() {
    const cfg = this.config.auth
    const req = {
      url: cfg.loginUrl,
      method: cfg.method,
      headers: cfg.headers,
      data: cfg.body
    }
    const res = await axios(req)
    const data = res.data
    const token = cfg.tokenPath ? pathGet(data, cfg.tokenPath) : data
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('auth_token_missing')
    }
    this.token = token
    logger.info('auth_token_refreshed')
    return token
  }

  start() {
    if (!this.config.auth.enabled) return
    const run = async () => {
      try {
        await this.refresh()
      } catch (e) {
        logger.error(`auth_refresh_failed:${e.message}`)
      }
    }
    run()
    this.timer = setInterval(run, this.config.auth.refreshIntervalMs)
  }

  getHeaders() {
    if (!this.token) return {}
    const name = this.config.auth.headerName
    const prefix = this.config.auth.headerPrefix || ''
    if (!name) return {}
    return { [name]: `${prefix}${this.token}` }
  }
}

module.exports = { AuthClient }
