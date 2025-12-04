const express = require("express");
const dotenv = require("dotenv");
const logger = require("./logger");
const config = require("./config");
const { createMqttClient } = require("./mqttClient");
const { DoorClient } = require("./doorClient");
const { AuthClient } = require("./authClient");

dotenv.config();

const app = express();
app.use(express.json());

const authClient = new AuthClient(config);
if (config.auth.enabled) authClient.start();
const doorClient = new DoorClient(
  config,
  config.auth.enabled ? authClient : null
);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/open-door", async (req, res) => {
  try {
    const result = await doorClient.openOnce();
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.post("/auth/refresh", async (req, res) => {
  try {
    if (!config.auth.enabled) return res.json({ ok: true, skipped: true });
    const token = await authClient.refresh();
    res.json({ ok: true, token });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
console.log(config, "config");
if (config.bemfa.enabled) {
  const mqtt = createMqttClient(config);
  mqtt.on("message", async (topic, payload) => {
    const msg = payload.toString().trim();
    console.log(topic, msg, "mqtt_message");
    if (topic === config.bemfa.topic && msg === "on") {
      try {
        await doorClient.openOnce();
      } catch (e) {
        logger.error(`door_open_failed: ${e.message}`);
      }
    }
  });
}

app.listen(config.http.port, () => {
  logger.info(`server_listen:${config.http.port}`);
});
