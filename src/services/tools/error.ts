import 'dotenv/config';
import { enviarDadosDoCliente, LeadRegister } from "../../adapters/backend"

export const error = async (dados: LeadRegister) => {
    try {
        await enviarDadosDoCliente({
            name_template: "error_lead",
            dados
        });
        return true;
    } catch (e: any) {
        console.log(e)
        return false;
    }
}