const dotenv = require("dotenv");
dotenv.config();

const http = {
  port: Number(process.env.PORT || 3000),
};

const bemfa = {
  enabled: Boolean(process.env.BEMFA_CLIENT_ID && process.env.BEMFA_TOPIC),
  url: process.env.BEMFA_URL || "mqtt://bemfa.com:9501",
  clientId: process.env.BEMFA_CLIENT_ID || "",
  topic: process.env.BEMFA_TOPIC || "",
};

const door = {
  url: process.env.DOOR_API_URL || "",
  method: (process.env.DOOR_API_METHOD || "POST").toUpperCase(),
  headers: (() => {
    try {
      return process.env.DOOR_API_HEADERS
        ? JSON.parse(process.env.DOOR_API_HEADERS)
        : {};
    } catch (_) {
      return {};
    }
  })(),
  body: (() => {
    try {
      return process.env.DOOR_API_BODY
        ? JSON.parse(process.env.DOOR_API_BODY)
        : {};
    } catch (_) {
      return {};
    }
  })(),
  cooldownMs: Number(process.env.DOOR_COOLDOWN_MS || 5000),
};

const auth = {
  enabled: Boolean(process.env.AUTH_LOGIN_URL),
  loginUrl: process.env.AUTH_LOGIN_URL || "",
  method: (process.env.AUTH_LOGIN_METHOD || "POST").toUpperCase(),
  headers: (() => {
    try {
      return process.env.AUTH_LOGIN_HEADERS
        ? JSON.parse(process.env.AUTH_LOGIN_HEADERS)
        : {};
    } catch (_) {
      return {};
    }
  })(),
  body: (() => {
    try {
      return process.env.AUTH_LOGIN_BODY
        ? JSON.parse(process.env.AUTH_LOGIN_BODY)
        : {};
    } catch (_) {
      return {};
    }
  })(),
  tokenPath: process.env.AUTH_TOKEN_PATH || "token",
  headerName: process.env.AUTH_HEADER_NAME || "Authorization",
  headerPrefix: process.env.AUTH_HEADER_PREFIX || "Bearer ",
  refreshIntervalMs: Number(process.env.AUTH_REFRESH_INTERVAL_MS || 3600000),
};

module.exports = { http, bemfa, door, auth };
