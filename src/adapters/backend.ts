import axios from "axios"
import { createLeadInRdMarketing, RdLeadPayload } from "../services/tools/rdStation"

export interface Task {
    name_template: string,
    dados: LeadRegister
}

export interface LeadRegister {
    nome: string,
    email: string,
    contexto?: string,
    solucao?: string,
    produto?: string,
    nivelInteresse?: string,
    problemaCentral?: string,
    objetivoLead?: string,
    tomLead?: string,
    urgenciaLead?: string,
    instrucao?: string,
    localidade?: string,
    telefone: string,
    nomeAgente: string,
    telefoneAgente: string,
    problema?: string,
    etapa?: string,
}

export async function enviarLeadParaRD(payload: RdLeadPayload) {
    return createLeadInRdMarketing(payload);
}


export async function enviarDadosDoCliente(dados: Task) {
    try {
        const lead = dados.dados;

        const normalizeEmpresa = (ctx?: string) => {
            if (!ctx) return undefined;
            const firstPart = ctx.split(',')[0].trim();
            return firstPart.replace(/^Empresa\s+/i, '').trim();
        };

        const dealName = (() => {
            const empresa = normalizeEmpresa(lead.contexto);
            const cliente = lead.nome?.trim();
            const cidade = lead.localidade?.trim();
            return [empresa, cliente, cidade].filter(Boolean).join(' - ') ||
                lead.objetivoLead ||
                lead.problemaCentral ||
                lead.nome;
        })();

        // Primeiro, tenta criar/atualizar lead e deal na RD Station (se email estiver presente)
        try {
            await enviarLeadParaRD({
                email: lead.email,
                name: lead.nome,
                phone: lead.telefone,
                companyName: normalizeEmpresa(lead.contexto) ?? lead.contexto,
                dealName,
                tags: [
                    dados.name_template,
                    lead.nivelInteresse,
                    lead.tomLead,
                    lead.urgenciaLead
                ].filter(Boolean) as string[]
            });
        } catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            const data = axios.isAxiosError(err) ? err.response?.data : undefined;
            console.error('[RD_STATION]', status ?? 'error', data ?? (err as any)?.message ?? err);
        }

        const baseUrl = (process.env.ROTA_BACK_END ?? "https://fluxy-agente.egnehl.easypanel.host").replace(/\/+$/, "");
        const { data, status } = await axios.post(
            `${baseUrl}/api/v1/vendas`,
            dados
            
        );

        console.log('[BACKEND] status', status, 'data', data);
        return status ? true : false;
    } catch (e: any) {
        if (axios.isAxiosError(e)) {
            console.error('[BACKEND_ERROR]', e.response?.status ?? 'no_status', e.response?.data ?? e.message);
        } else {
            console.error('[BACKEND_ERROR]', e?.message ?? e);
        }
        return false;
    }
}
