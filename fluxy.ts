import 'dotenv/config';

import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';

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

    instrucao: z.string().min(10, 'Instrução incompleta')
  }),

  execute: async (params, toolContext: SessionContext) => {
    try {
      const {
        nome,
        contexto,
        problemaCentral,
        objetivoLead,
        solucao,
        tomLead,
        urgenciaLead,
        instrucao
      } = params;

      const session = toolContext?.invocationContext?.session;

      const telefoneLead =
        session?.user?.phone ??
        process.env.DEFAULT_LEAD_PHONE ??
        null;

      /* ===============================
         LOG ESTRUTURADO
      =============================== */

      console.log('[NEW LEAD]', {
        nome,
        contexto,
        problemaCentral,
        objetivoLead,
        solucao,
        tomLead,
        urgenciaLead,
        instrucao
      });

      /* ===============================
         PAYLOAD
      =============================== */

      const dados = {
        nome,
        produto: contexto,
        nivelInteresse: solucao,
        problemaCentral,
        objetivoLead,
        tomLead,
        urgenciaLead,
        instrucao,

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


export const errorLead = new FunctionTool({
  name: 'error_lead',
  description: 'Registra problemas técnicos do cliente',

  parameters: z.object({
    nome: z.string().min(2),

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
      const { nome, problema, etapa } = params;

      const session = toolContext?.invocationContext?.session;

      const telefone =
        session?.user?.phone ??
        process.env.DEFAULT_SUPPORT_PHONE ??
        null;

      const dados = {
        nome,
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
  SYSTEM — GAMEFIC SALES INTELLIGENCE AGENT

You are the official Enterprise Sales Agent of Gamefic.

You diagnose before proposing.
You clarify before selling.
You structure before closing.

━━━━━━━━━━━━━━━━━━━
CORE PRINCIPLES
━━━━━━━━━━━━━━━━━━━

• Never interrogate
• Never use forms
• Always infer
• Precision > Speed
• Clarity > Volume

━━━━━━━━━━━━━━━━━━━
ABOUT GAMEFIC
━━━━━━━━━━━━━━━━━━━

Gamefic is a behavioral execution system.

Gamification = Methodology  
Gamefic = Technology

━━━━━━━━━━━━━━━━━━━
MANDATORY DATA
━━━━━━━━━━━━━━━━━━━

Before registering any lead, you must clearly identify:

✓ Name  
✓ Interest  
✓ Urgency  

No exceptions.

━━━━━━━━━━━━━━━━━━━
EXECUTION RULES
━━━━━━━━━━━━━━━━━━━

Only execute the register_lead tool when all mandatory data is explicit.

Otherwise, continue qualifying the lead.

Execute the error_lead tool if the user deviates from Gamefic-related topics
after three consecutive redirection attempts.

If the user insists on unrelated subjects,
respond politely and inform that this channel is restricted to Gamefic matters.

━━━━━━━━━━━━━━━━━━━
QUESTIONING STYLE
━━━━━━━━━━━━━━━━━━━

• Executive  
• Open-ended  
• Strategic  
• B2B-oriented  

Examples:

"What is currently limiting your execution?"  
"What happens if nothing changes?"  
"Where does performance break down?"

━━━━━━━━━━━━━━━━━━━
LANGUAGE RULE
━━━━━━━━━━━━━━━━━━━

Always communicate with the user in Brazilian Portuguese.
Never answer in English.

━━━━━━━━━━━━━━━━━━━
FINAL PRINCIPLE
━━━━━━━━━━━━━━━━━━━

Those who organize understanding, control decisions.
`,

  tools: [registerLead, errorLead]
});

/* ======================================================
   START COMMANDS

   npx adk web
   npx adk api_server
====================================================== */
