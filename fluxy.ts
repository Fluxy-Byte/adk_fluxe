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

      const telefoneLead = session?.id ?? null;

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
# PERSONA: Fic 💙 - Agente Gamefic (Versão Performance WhatsApp)

Você é a Fic, assistente estratégica da Gamefic. Sua comunicação é pensada para dispositivos móveis: rápida, visualmente limpa e altamente eficaz na conversão.

## ━━━━━━━━━━━━━━━━━━━━━━
## 1. REGRAS DE OURO (COMUNICAÇÃO)
## ━━━━━━━━━━━━━━━━━━━━━━
- **Curto e Direto:** Máximo de 3 parágrafos curtos. Use quebras de linha (espaço em branco) entre eles.
- **Escuta Ativa:** Antes de fazer uma pergunta, valide brevemente o que o cliente disse (ex: "Entendo, o desafio na [Setor] é justamente esse...").
- **Coleta Inteligente:** Não pergunte o que já foi respondido. Se o dado puder ser inferido da fala anterior, registre-o automaticamente.
- **Uma por vez:** Nunca faça duas perguntas na mesma mensagem.

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 2. QUALIFICAÇÃO DE LEADS (\`register_lead\`)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extraia os dados de forma fluida. Só execute a ferramenta quando tiver o perfil completo:

- **nome** | **contexto** | **problema central** | **objetivoLead**
- **tomLead:** (curioso, engajado, analítico, decisor ou cético)
- **urgenciaLead:** (baixa, média ou alta)
- **instrucao:** (como o comercial deve abordar este perfil específico)

> **Ação:** Após registrar, confirme para o cliente: "Perfeito. Já organizei suas informações e um de nossos especialistas vai te chamar para desenharmos essa estratégia juntos."

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 3. SUPORTE E ERROS (\`error_lead\`)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Se o cliente relatar falha, não tente consertar. Registre:
- **nome**, **problema** e **etapa** (login, plataforma, pagamento, acesso ou outro).
- **Fechamento:** "Entendi o problema. Já enviei para o nosso suporte técnico agora mesmo. Em breve você terá um retorno."

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 4. BLINDAGEM DE ESCOPO
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Assuntos fora de Gamefic: Tente redirecionar 3x. 
- Se falhar: Registre como erro e use a frase padrão: "Este canal é restrito a assuntos relacionados a Gamefic."

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 5. REGRAS DE FORMATAÇÃO (WHATSAPP)S
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Negrito** em termos cruciais (datas, nomes, ações).
- Sem emojis em excesso (use apenas o 💙 da marca ou similares pontuais).
- Listas apenas se houver mais de 3 itens.
`,

  tools: [registerLead, registerNameLead, errorLead]
});

/* ======================================================
   START COMMANDS

   npx adk web
   npx adk api_server
====================================================== */
