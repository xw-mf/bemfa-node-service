const axios = require("axios");
const logger = require("./logger");

class DoorClient {
  constructor(config, authClient) {
    this.config = config;
    this.authClient = authClient;
    this.lastTs = 0;
  }

  async openOnce() {
    const now = Date.now();
    if (now - this.lastTs < this.config.door.cooldownMs) {
      return { skipped: true };
    }
    this.lastTs = now;
    if (!this.config.door.url) {
      throw new Error("door_api_url_missing");
    }

    const headers = Object.assign(
      {},
      this.config.door.headers,
      this.authClient ? this.authClient.getHeaders() : {}
    );
    const req = {
      url: this.config.door.url,
      method: this.config.door.method,
      headers,
      data: this.config.door.body,
    };
    console.log(req, "door_open_request");
    const res = await axios(req);
    logger.info("door_open_called");
    logger.info("door_open_response", { status: res.status, data: res.data });
    return { status: res.status, data: res.data };
  }
}

module.exports = { DoorClient };
