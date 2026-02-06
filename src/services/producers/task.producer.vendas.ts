import { getConectionTheChannel } from '../../infra/rabbitMQ/conection';
import { connectRabbit } from "../../infra/rabbitMQ/conection";

interface Task {
    "nome": string,
    "produto": string,
    "nivelInteresse": string
}

export async function createTaskCampaign(task: Task) {

    try {
        await connectRabbit()
        const nomeFila = process.env.NOME_FILA_RABBITMQ ?? "fluxy";
        const channel = getConectionTheChannel()
        console.log(`🔵 Criou na fila campaing`);
        const queue = `task.${nomeFila}.campaign.vendas`
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(task)), {
            persistent: true
        })
        return;
    } catch (e: any) {
        console.log("Erro ao iniciar conexão com rabbitmq: " + e)
    }
}