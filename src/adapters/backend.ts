import axios from "axios"
import { createLeadInRdMarketing, RdLeadPayload } from "../services/tools/rdStation"

export interface Task {
    name_template: string,
    dados: LeadRegister
}

export interface LeadRegister {
    nome: string,
    email?: string,
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
        // Primeiro, tenta criar/atualizar lead e deal na RD Station (se email estiver presente)
        try {
            if (dados.dados.email) {
                await enviarLeadParaRD({
                    email: dados.dados.email,
                    name: dados.dados.nome,
                    phone: dados.dados.telefone,
                    companyName: dados.dados.contexto,
                    dealName: dados.dados.objetivoLead ?? dados.dados.problemaCentral ?? dados.dados.nome,
                    tags: [
                        dados.name_template,
                        dados.dados.nivelInteresse,
                        dados.dados.tomLead,
                        dados.dados.urgenciaLead
                    ].filter(Boolean) as string[]
                });
            } else {
                console.warn('[RD_STATION] Lead sem email - integracao RD ignorada.');
            }
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

