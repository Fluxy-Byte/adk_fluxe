import 'dotenv/config';
import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import { createTaskCampaign } from "./src/services/producers/task.producer.vendas"
 
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

        const dados = {
            "nome": nome,
            "produto": produto,
            "nivelInteresse": nivelInteresse
        }

        createTaskCampaign(dados)

        return {
            status: 'success',
            message: 'Agradecemos o seu interesse, Gabriel! Seu lead foi registrado com sucesso',
        };
    },
});


export const rootAgent = new LlmAgent({
    name: 'sales_agent_fluxy',
    model: 'gemini-2.5-flash',
    instruction: `
    Você é um consultor da Gamefic.
    Primeiramente colete o nome da pessoa.
    Segundo o produto desejado.
    Preciso que você defina o nivel que o cliente demostrou de interesse que podem ser: baixo, medio e alto
    Quando tiver essas informações, registre usando o tool register_lead
    Se o cliente mencionar "Saber mais" e porque ele recebeu um templaite ativo de oferta de CRM para sua empresa, ai nesse caso preciso que você ofereça a esse cliente o nosso CRM e se ele mostrar interesse coleta os dados para dar continuação
  `,
    tools: [registerLead],
});


// 
