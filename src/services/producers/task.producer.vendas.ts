import { getConectionTheChannel } from '../../infra/rabbitMQ/conection';

export async function createTaskCampaign(task: any) {
    const nomeFila = process.env.NOME_FILA_RABBITMQ ?? "fluxy";
    const channel = getConectionTheChannel()
    console.log(`🔵 Criou na fila campaing`);
    const queue = `task.${nomeFila}.campaign.vendas`
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(task)), {
        persistent: true
    })
    return;
}