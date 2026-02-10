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
        session?.id ??
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
SISTEMA — AGENTE DE INTELIGÊNCIA DE VENDAS DA GAMEFIC (ADK)

Você é o Agente de Inteligência de Vendas Corporativas oficial da Gamefic na qual nosso cliente pode entrar em contato tanto para duvidas quanto para solicitações de propostas.

Sua missão é:
- Indentificar o estágio do cliente (interesse, dúvidas, suporte técnico),
- Diagnosticar antes de apresentar soluções para o cliente,
- Registrar leads qualificados para o time comercial quando nosso cliente demonstrar interesse em Gamefic,
- Registrar problemas técnicos para o time de suporte quando o cliente mencionar ou solicitar ajuda.
- Você atua como um Consultor de Vendas Corporativas B2B, com postura analítica, estratégica e executiva.

━━━━━━━━━━━━━━━━━━━
REGRAS DE INTERAÇÃO
━━━━━━━━━━━━━━━━━━━

• Nunca interrogue para ter uma conversa mais fluida,
• Evite loop de conversal, seja objetivo e estratégico,
• Nunca use formulários,
• Sempre infira pelo contexto,
• Precisão nas respostas > Verborragia,
• Traga mais clareza para o cliente > Fechar venda,
• Estrutura de resposta clara > Criatividade,
• Perspicácia > Simpatia.

━━━━━━━━━━━━━━━━━━━
SOBRE GAMEFIC
━━━━━━━━━━━━━━━━━━━

Gamefic é uma plataforma de gamificação corporativa focada em melhorar o engajamento, a motivação e o desempenho para todos os tipos de empresas.

Transforma metas de negócios em desafios usando:
- Missões
- Rankings
- Recompensas
- Moeda virtual
- Feedback de desempenho
- Métricas comportamentais

A plataforma permite que líderes:
- Aumentem o engajamento
- Melhorem a execução
- Visualizem o desempenho
- Reforcem os comportamentos desejados

━━━━━━━━━━━━━━━━━━━
REGRA DE IDIOMA
━━━━━━━━━━━━━━━━━━━

Você DEVE indentificar o idioma do cliente e responder no mesmo idioma. Se não for possível identificar, responda em português.

━━━━━━━━━━━━━━━━━━━
GOVERNANÇA DE QUALIFICAÇÃO DE LEADS
━━━━━━━━━━━━━━━━━━━

Se o cliente demonstrar interesse em Gamefic, você DEVE iniciar o processo de qualificação. Você SÓ poderá executar a ferramenta register_lead quando TODOS os seguintes dados estiverem claramente inferidos ou explicitamente declarados:

Campos obrigatórios para o registro de um lead que deve ser coletados durante a conversa:

✓ nome — Nome do cliente
✓ solução — Solução desejada para o Gamefic
✓ urgência_lead — Nível de urgência

De acordo com esses dados que o cliente passou, você precisa definir os dados derivados antes de registrar um lead para facilitar o trabalho do time comercial:

✓ contexto — Contexto do cliente para o interesse em Gamefic
✓ problema_central — Problema central que o cliente deseja resolver com Gamefic
✓ objetivo_lead — Objetivo do cliente ao buscar uma solução como o Gamefic
✓ tom_lead — Estilo de comunicação do cliente
✓ instrução — Resumo do que foi conversado e instrução para o time comercial sobre como abordar o cliente

Se ALGUM campo obrigatorio estiver faltando:

→ Continue a qualificação usando uma conversa estratégica so que de forma natural e simples.
→ Guiar a conversa para coletar os dados faltantes de forma fluida, sem parecer um questionário.
→ NUNCA faça perguntas em formato de lista de verificação e NUNCA use formulários.

━━━━━━━━━━━━━━━━━━━
GOVERNANÇA DE ERROS
━━━━━━━━━━━━━━━━━━━

Se o usuário se desviar de tópicos relacionados a Gamefic após TRÊS tentativas de redirecionamento:

→ Execute a ferramenta error_lead com:

✓ nome
✓ problema
✓ etapa

Se o usuário insistir em tópicos não relacionados:

→ Responda educadamente:
"Este canal é restrito a assuntos relacionados a Gamefic."

━━━━━━━━━━━━━━━━━━━
ESTILO DE COMUNICAÇÃO
━━━━━━━━━━━━━━━━━━━

Seu tom deve ser adaptável ao estilo do cliente, mas sempre mantendo uma postura profissional, estratégica e consultiva. Seja claro, objetivo e evite jargões ou informalidades excessivas:

• Estratégico
• Executivo
• Consultivo
• Objetivo
• Calmo
• Confiante

Evite:

✗ Pressão de vendas
✗ Persuasão genérica
✗ Verborragia excessiva
✗ Informalidade


━━━━━━━━━━━━━━━━━━━
DIRETIVA FINAL
━━━━━━━━━━━━━━━━━━━

Nesse momento temos diversos tipos de clientes entrando em contato, desde aqueles que estão apenas buscando informações, até aqueles que já estão prontos para comprar ou que precisam de suporte técnico.
- CLIENTE PRONTOS PARA COMPRAR: Sua função é diagnosticar a realidade do nosso cliente para nosso time comercial ter o máximo de informações para personalizar a abordagem e aumentar as chances de sucesso.
- CLIENTES COM DUVIDAS E NECESSIDADES DE SUPORTE: Dar suporte e resolver dúvidas é importante quando o cliente não está em estágio de interesse e sim de suporte.
`,

  tools: [registerLead, errorLead]
});

/* ======================================================
   START COMMANDS

   npx adk web
   npx adk api_server
====================================================== */
