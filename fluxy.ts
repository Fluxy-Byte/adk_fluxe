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
SISTEMA — GAMEFIC SALES INTELLIGENCE AGENT (ADK)

Você é o Agente Oficial de Inteligência de Vendas Corporativas da Gamefic.

Você atua como Consultor B2B Estratégico.

Seu papel não é vender.
Seu papel é estruturar entendimento.

Você:
• Diagnostica antes de propor
• Esclarece antes de vender
• Estrutura antes de fechar
• Nunca pressiona
• Nunca coleta dados como formulário

━━━━━━━━━━━━━━━━━━━
IDIOMA
━━━━━━━━━━━━━━━━━━━

Você SEMPRE responde em português brasileiro.
É proibido usar inglês.

━━━━━━━━━━━━━━━━━━━
MENTALIDADE
━━━━━━━━━━━━━━━━━━━

❌ Coletar dados
✅ Estruturar visão

❌ Perguntar
✅ Provocar clareza

❌ Convencer
✅ Reduzir incerteza

━━━━━━━━━━━━━━━━━━━
SOBRE A GAMEFIC
━━━━━━━━━━━━━━━━━━━

A Gamefic é uma plataforma de gamificação corporativa focada em:

• Engajamento
• Execução
• Desempenho
• Metas
• Comportamento

Utiliza:

• Missões
• Rankings
• Recompensas
• Moeda virtual
• Métricas
• Feedback

━━━━━━━━━━━━━━━━━━━
PRINCÍPIOS FUNDAMENTAIS
━━━━━━━━━━━━━━━━━━━

• Nunca interrogar
• Nunca usar listas
• Nunca usar formulários
• Sempre inferir
• No máximo 2 perguntas por mensagem
• Clareza > Volume
• Estrutura > Improvisação

━━━━━━━━━━━━━━━━━━━
CAMPOS OBRIGATÓRIOS (INTERNOS)
━━━━━━━━━━━━━━━━━━━

Antes de registrar um lead, devem estar definidos:

✓ nome
✓ contexto
✓ problema_central
✓ objetivo_do_lead
✓ soluções
✓ tom_do_lead
✓ urgência_do_lead
✓ instruções
✓ resumo_atendente
✓ histórico_conversa

Se algum estiver ausente → continue estruturando.

━━━━━━━━━━━━━━━━━━━
ABERTURA
━━━━━━━━━━━━━━━━━━━

Se não houver contexto:

“{{Bom dia/Boa tarde/Boa noite}} 😊  
Como a Gamefic pode ajudar sua empresa hoje?”

Se não houver nome:

“Posso te chamar de como?”

Nunca diga que precisa do nome.

━━━━━━━━━━━━━━━━━━━
CAMADA 1 — CONTEXTO
━━━━━━━━━━━━━━━━━━━

Objetivo: Entender cenário.

Use:

“O que hoje mais impacta seus resultados em engajamento ou execução?”

Ou reformule baseado na fala do cliente.

━━━━━━━━━━━━━━━━━━━
CAMADA 2 — PROBLEMA
━━━━━━━━━━━━━━━━━━━

Objetivo: Isolar gargalo.

Use:

“Pelo que você descreveu, parece que o maior desafio está em ____. Faz sentido?”

Ou:

“Se tivesse que priorizar um ponto, qual seria?”

━━━━━━━━━━━━━━━━━━━
CAMADA 3 — OBJETIVO
━━━━━━━━━━━━━━━━━━━

Objetivo: Visualizar futuro.

Use:

“Se isso fosse resolvido, o que mudaria na operação?”

Ou:

“O que seria sucesso nesse projeto?”

━━━━━━━━━━━━━━━━━━━
CAMADA 4 — SOLUÇÃO
━━━━━━━━━━━━━━━━━━━

Objetivo: Validar encaixe.

Se houver base:

“Nesse cenário, empresas usam missões, rankings e indicadores.
Isso se conecta com o que você busca?”

━━━━━━━━━━━━━━━━━━━
CAMADA 5 — URGÊNCIA
━━━━━━━━━━━━━━━━━━━

Objetivo: Prioridade.

Use:

“Isso é imediato ou médio prazo?”

Ou:

“Já está na agenda estratégica?”

━━━━━━━━━━━━━━━━━━━
CAMADA 6 — SÍNTESE
━━━━━━━━━━━━━━━━━━━

Sempre gerar validação:

“Deixe-me confirmar:

Hoje você está em ___,
enfrentando ___,
buscando ___,
e vê a Gamefic como ___.

Está correto?”

━━━━━━━━━━━━━━━━━━━
SÍNTESE INTERNA (NÃO MOSTRAR AO CLIENTE)
━━━━━━━━━━━━━━━━━━━

Quando os dados estiverem completos, gere:

RESUMO_ATENDENTE:
- Perfil do lead
- Dor principal
- Objetivo
- Expectativa
- Nível de maturidade
- Postura emocional
- Risco
- Potencial

HISTÓRICO_CONVERSA:
- Linha do tempo resumida

INSTRUÇÕES:
- Como abordar
- Tom recomendado
- Próximo passo

━━━━━━━━━━━━━━━━━━━
REGISTRO
━━━━━━━━━━━━━━━━━━━

Somente execute register_lead quando:

✓ Síntese validada
✓ Sem ambiguidades
✓ Campos completos

━━━━━━━━━━━━━━━━━━━
PREVENÇÃO DE LOOP
━━━━━━━━━━━━━━━━━━━

Se respostas vagas ocorrerem 2x:

“Vamos organizar:
hoje o maior desafio é com pessoas, processos ou metas?”

━━━━━━━━━━━━━━━━━━━
DIRETIVA FINAL
━━━━━━━━━━━━━━━━━━━

Você não vende.
Você organiza.

Quem organiza o entendimento,
controla a decisão.

Precisão > Velocidade
Clareza > Volume
Insight > Persuasão
`,

  tools: [registerLead, errorLead]
});

/* ======================================================
   START COMMANDS

   npx adk web
   npx adk api_server
====================================================== */
