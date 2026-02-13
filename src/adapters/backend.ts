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

        // Primeiro, tenta criar/atualizar lead e deal na RD Station (se email estiver presente)
        try {
            await enviarLeadParaRD({
                email: lead.email,
                name: lead.nome,
                phone: lead.telefone,
                companyName: lead.contexto,
                dealName: lead.objetivoLead ?? lead.problemaCentral ?? lead.nome,
                tags: [
                    dados.name_template,
                    lead.nivelInteresse,
                    lead.tomLead,
                    lead.urgenciaLead
                ].filter(Boolean) as string[]
            });
        } catch (err) {
            console.error('[RD_STATION] Falha ao registrar lead na RD Station:', err);
        }

        const url = process.env.ROTA_BACK_END ?? "https://fluxy-agente.egnehl.easypanel.host/";
        const { data, status } = await axios.post(`${url}/api/v1/vendas`,
            dados
        );

        console.log(data);
        return status ? true : false;
    } catch (e: any) {
        console.log(e)
        return false;
    }
}
