import 'dotenv/config';
import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import { connectRabbit } from "./src/infra/rabbitMQ/conection";

try {
    await connectRabbit()
} catch (e: any) {
    console.log("Erro ao iniciar conexão com rabbitmq: " + e)
}

const registerLead = new FunctionTool({
    name: 'register_lead',
    description: 'Registra no sistema os dados do cliente interessado em um produto.',
    parameters: z.object({
        nome: z.string().describe('Nome do cliente'),
        produto: z.string().describe('Produto de interesse'),
        nivelInteresse: z.enum(['baixo', 'medio', 'alto']).describe('Nível de interesse do cliente'),
    }),

    execute: ({ nome, produto, nivelInteresse }) => {

        console.log('📌 Novo Lead Registrado');
        console.log('Nome:', nome);
        console.log('Produto:', produto);
        console.log('Interesse:', nivelInteresse);

        // Aqui futuramente você pode salvar no banco, API, CRM etc

        return {
            status: 'success',
            message: 'Lead registrado com sucesso!',
        };
    },
});


export const rootAgent = new LlmAgent({
    name: 'sales_agent',
    model: 'gemini-2.5-flash',
    instruction: `
    Você é um consultor da Gamefic.
    Primeiramente colete o nome da pessoa.
    Segundo o produto desejado.
    Preciso que você defina o nivel que o cliente demostrou de interesse que podem ser: baixo, medio e alto
    Quando tiver essas informações, registre usando o tool register_lead.
  `,
    tools: [registerLead],
});
