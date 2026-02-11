import axios from "axios"

export interface Task {
    name_template: string,
    dados: LeadRegister
}

export interface LeadRegister {
    nome: string,
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

export async function enviarDadosDoCliente(dados: Task) {
    try {
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