const mqtt = require('mqtt')
const logger = require('./logger')

function createMqttClient(config) {
  const client = mqtt.connect(config.bemfa.url, {
    clientId: config.bemfa.clientId,
    reconnectPeriod: 2000,
    keepalive: 60
  })

  client.on('connect', () => {
    client.subscribe(config.bemfa.topic, { qos: 0 }, (err) => {
      if (err) {
        logger.error(`mqtt_subscribe_failed:${config.bemfa.topic}`)
      } else {
        logger.info(`mqtt_subscribed:${config.bemfa.topic}`)
      }
    })
  })

  client.on('error', (e) => {
    logger.error(`mqtt_error:${e.message}`)
  })

  return client
}

module.exports = { createMqttClient }
