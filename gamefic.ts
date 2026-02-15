import 'dotenv/config';

import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import { updateNameLead } from './src/infra/database/contact';
import { error } from './src/services/tools/error';
import { sendClienteToAgenteHuman } from './src/services/tools/sendClienteToAgenteHuman';

/* ======================================================
   TYPES
====================================================== */

type SessionContext = any;

/* ======================================================
   REGISTER LEAD TOOL
====================================================== */

export const registerLead = new FunctionTool({
  name: 'register_lead',
  description: 'Registra um lead B2B qualificado no sistema Gamefic',

  parameters: z.object({
    nome: z.string().min(2, 'Nome inválido'),
    email: z.string().email('Email inválido'),

    contexto: z.string().min(10, 'Contexto insuficiente'),

    problemaCentral: z.string().min(10, 'Problema mal definido'),

    objetivoLead: z.string().min(5, 'Objetivo fraco'),

    solucao: z.string().min(5, 'Solução não clara'),

    tomLead: z.enum([
      'curioso',
      'engajado',
      'analitico',
      'decisor',
      'cetico'
    ]),

    urgenciaLead: z.enum([
      'baixa',
      'media',
      'alta'
    ]),

    instrucao: z.string().min(10, 'Instrução incompleta'),
    localidade: z.string().optional()
  }),

  execute: async (params, toolContext: SessionContext) => {
    try {
      const {
        nome,
        email,
        contexto,
        problemaCentral,
        objetivoLead,
        solucao,
        tomLead,
        urgenciaLead,
        instrucao,
        localidade
      } = params;

      const session = toolContext?.invocationContext?.session;

      const telefoneLead = session?.id ?? null;

      /* ===============================
         LOG ESTRUTURADO
      =============================== */

      console.log('[NEW LEAD]', {
        nome,
        email,
        contexto,
        problemaCentral,
        objetivoLead,
        solucao,
        tomLead,
        urgenciaLead,
        instrucao,
        localidade
      });

      /* ===============================
         PAYLOAD
      =============================== */

      const dados = {
        nome,
        email,
        contexto,
        produto: contexto,
        nivelInteresse: solucao,
        problemaCentral,
        objetivoLead,
        tomLead,
        urgenciaLead,
        instrucao,
        localidade,

        telefone: telefoneLead,

        nomeAgente:
          process.env.NOME_AGENTE_VENDAS ?? 'Agente Gamefic',

        telefoneAgente:
          process.env.NUMBER_VENDAS ?? '5534997801829'
      };



      await sendClienteToAgenteHuman(dados);

      return {
        status: 'success',
        message:
          'Obrigado pelo contato. Seu atendimento será continuado por um especialista.'
      };

    } catch (err) {
      console.error('[REGISTER ERROR]', err);

      return {
        status: 'error',
        message:
          'Falha ao registrar lead. Tente novamente.'
      };
    }
  }
});



export const registerNameLead = new FunctionTool({
  name: 'register_name_lead',
  description: 'Registra o nome capturado do lead para o time comercial',

  parameters: z.object({
    nome: z.string().min(2, 'Nome inválido')
  }),

  execute: async (params, toolContext: SessionContext) => {
    try {
      const {
        nome
      } = params;

      const session = toolContext?.invocationContext?.session;

      const telefoneLead =
        session?.id ??
        process.env.DEFAULT_LEAD_PHONE ??
        null;

      /* ===============================
         LOG ESTRUTURADO
      =============================== */

      console.log('[Atualizado nome do Lead]', {
        nome
      });

      /* ===============================
         PAYLOAD
      =============================== */


      await updateNameLead(telefoneLead, nome);

      return {
        status: 'success',
        message:
          `Contato atualizado com sucesso. O nome do lead é ${nome}.`
      };

    } catch (err) {
      console.error('[REGISTER ERROR]', err);

      return {
        status: 'error',
        message:
          'Falha ao registrar nome do lead. Tente novamente.'
      };
    }
  }
});


export const errorLead = new FunctionTool({
  name: 'error_lead',
  description: 'Registra problemas técnicos do cliente',

  parameters: z.object({
    nome: z.string().min(2),
    email: z.string().email(),

    problema: z.string().min(5),

    etapa: z.enum([
      'login',
      'plataforma',
      'pagamento',
      'acesso',
      'outro'
    ])
  }),

  execute: async (params, toolContext: SessionContext) => {
    try {
      const { nome, email, problema, etapa } = params;

      const session = toolContext?.invocationContext?.session;

      const telefone =
        session?.user?.phone ??
        process.env.DEFAULT_SUPPORT_PHONE ??
        null;

      const dados = {
        nome,
        email,
        problema,
        etapa,

        telefone,

        nomeAgente:
          process.env.NOME_AGENTE_SUPORTE ?? 'Suporte Gamefic',

        telefoneAgente:
          process.env.NUMBER_SUPORTE ?? '5534997801829'
      };

      console.log('[SUPPORT]', dados);

      await error(dados);

      return {
        status: 'success',
        message:
          `Obrigado, ${nome}. Nosso suporte já recebeu sua solicitação.`
      };

    } catch (err) {
      console.error('[SUPPORT ERROR]', err);

      return {
        status: 'error',
        message:
          'Erro ao registrar suporte.'
      };
    }
  }
});


/* ======================================================
   ROOT AGENT
====================================================== */

export const rootAgent = new LlmAgent({
  name: 'sales_agent_fluxy',

  model: 'gemini-2.5-flash',

  instruction: `
Você e uma agente inteligente de atendimentos da Gamefic 💙 que se chama Fic e você deve seguir algumas funções e regras de comunicação.

━━━━━━━━━━━━━━━━━━━━━━
REGRAS DE COMUNICAÇÃO
━━━━━━━━━━━━━━━━━━━━━━

- Seja sempre educada, profissional e estratégica com atendimento venda B2B.
- Adapte seu tom ao estilo do cliente, mas sempre mantendo uma postura consultiva e executiva.
- Seja clara, objetiva e evite jargões ou informalidades excessivas.
- Evite pressão de vendas, persuasão genérica, verborragia excessiva e informalidade.
- Responda no mesmo idioma do cliente, se não for possível identificar, responda em português.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENTES COM INTERESSE EM GAMEFIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Se o cliente demonstrar interesse em Gamefic, conduza a conversa de forma estratégica para entender o contexto do cliente, o problema central que ele deseja resolver, o objetivo dele ao buscar uma solução como o Gamefic, o nível de urgência e o tom de comunicação dele.
- Registre um lead qualificado para o time comercial usando a ferramenta register_lead somente quando todos os dados obrigatórios estiverem claramente inferidos ou explicitamente declarados.
- Se algum dado obrigatório estiver faltando, continue a qualificação usando uma conversa estratégica de forma natural e fluida, sem parecer um questionário e sem usar formulários.

Campos obrigatórios para registro de lead:

- nome
- email
- contexto (breve descrição do negócio e setor de atuação)
- problema central (descrição do que o cliente deseja resolver com o Gamefic)
- objetivoLead (o que o cliente espera alcançar com o Gamefic)
- tomLead (curioso, engajado, analítico, decisor ou cético)
- urgenciaLead (baixa, média ou alta)
- instrucao (instrução clara para o time comercial sobre como abordar o cliente)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENTES COM DUVIDAS E NECESSIDADES DE SUPORTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Se o cliente mencionar ou solicitar ajuda com algum problema técnico, registre o problema para o time de suporte usando a ferramenta error_lead.

Campos obrigatórios para registro de suporte:

- nome
- email
- nome da empresa
- localidade
- problema (descrição do problema técnico enfrentado)
- etapa (fase do processo onde o problema ocorreu: login, plataforma, pagamento, acesso ou outro)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENTES EM CASO DE EXTRAVIO DE TÓPICOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Se o cliente se desviar de tópicos relacionados a Gamefic após três tentativas de redirecionamento, execute a ferramenta error_lead para registrar o problema.
- Se o cliente insistir em tópicos não relacionados, responda educadamente: "Este canal é restrito a assuntos relacionados a Gamefic."
`,

  tools: [registerLead, registerNameLead, errorLead]
});

/* ======================================================
   START COMMANDS

   npx adk web
   npx adk api_server
====================================================== */
