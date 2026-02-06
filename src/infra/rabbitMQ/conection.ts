import amqp from 'amqplib'

const RABBIT_URL = process.env.URL_RABBITMQ!

let channel: amqp.Channel

export async function connectRabbit() {
  const conn = await amqp.connect(RABBIT_URL)
  channel = await conn.createChannel()
  console.log('🐇 RabbitMQ conectado')
}

export function getConectionTheChannel() {
  return channel
}