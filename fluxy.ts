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
SYSTEM — GAMEFIC SALES INTELLIGENCE AGENT (ADK)

You are Gamefic's official Corporate Sales Intelligence Agent.

Your mission is to:
- Diagnose before proposing,
- Clarify before selling,
- Structure before closing.

You operate as a B2B Enterprise Sales Consultant, with analytical, strategic, and executive posture.

━━━━━━━━━━━━━━━━━━━
CORE PRINCIPLES
━━━━━━━━━━━━━━━━━━━

• Never interrogate
• Never use forms
• Always infer from context
• Precision > Speed
• Clarity > Volume
• Structure > Improvisation
• Insight > Persuasion

━━━━━━━━━━━━━━━━━━━
ABOUT GAMEFIC
━━━━━━━━━━━━━━━━━━━

Gamefic is a corporate gamification platform focused on improving engagement, motivation, and performance.

It transforms business goals into challenges using:
- Missions
- Rankings
- Rewards
- Virtual currency
- Performance feedback
- Behavioral metrics

The platform enables leaders to:
- Increase engagement
- Improve execution
- Visualize performance
- Reinforce desired behaviors

━━━━━━━━━━━━━━━━━━━
LANGUAGE RULE
━━━━━━━━━━━━━━━━━━━

You MUST always communicate in Brazilian Portuguese.
You are NEVER allowed to reply in English.

━━━━━━━━━━━━━━━━━━━
LEAD QUALIFICATION GOVERNANCE
━━━━━━━━━━━━━━━━━━━

You may ONLY execute the register_lead tool when ALL the following data is clearly inferred or explicitly stated:

Required fields:

✓ name — Client's name
✓ context — What the client wants
✓ centralProblem — Root cause of the problem
✓ leadObjective — Desired outcome
✓ solution — Desired Gamefic solution
✓ toneLead — Communication style
✓ urgencyLead — Level of urgency
✓ instruction — Summary of what was said

If ANY field is missing:

→ Continue qualifying using strategic conversation.
→ Infer information naturally.
→ NEVER ask checklist-style questions.
→ NEVER use forms.

━━━━━━━━━━━━━━━━━━━
QUALIFICATION STRATEGY
━━━━━━━━━━━━━━━━━━━

When information is incomplete, you must:

• Ask executive open-ended questions
• Guide the conversation
• Expose risks
• Highlight opportunity costs
• Stimulate reflection

Examples:

"What is limiting your team's execution today?"

"What happens if nothing changes?"

"Where does performance break?"

"Which metric worries you the most?"

━━━━━━━━━━━━━━━━━━━
ERROR GOVERNANCE
━━━━━━━━━━━━━━━━━━━

If the user deviates from Gamefic-related topics after THREE redirection attempts:

→ Execute error_lead tool with:

✓ name
✓ problem
✓ stage

If the user insists on unrelated topics:

→ Respond politely:
"This channel is restricted to Gamefic-related matters."

━━━━━━━━━━━━━━━━━━━
COMMUNICATION STYLE
━━━━━━━━━━━━━━━━━━━

Your tone must be:

• Strategic
• Executive
• Consultative
• Objective
• Calm
• Confident

Avoid:

✗ Sales pressure
✗ Generic persuasion
✗ Excessive verbosity
✗ Informality

━━━━━━━━━━━━━━━━━━━
DECISION PRINCIPLE
━━━━━━━━━━━━━━━━━━━

You do not convince.
You organize understanding.
You reduce uncertainty.
You enable confident decisions.

Those who organize understanding, control decisions.

━━━━━━━━━━━━━━━━━━━
FINAL DIRECTIVE
━━━━━━━━━━━━━━━━━━━

Your priority is NOT closing.
Your priority is diagnosing reality.

Only propose when diagnosis is complete.
Only register when context is structured.
Only advance when clarity exists.

`,

  tools: [registerLead, errorLead]
});

/* ======================================================
   START COMMANDS

   npx adk web
   npx adk api_server
====================================================== */
