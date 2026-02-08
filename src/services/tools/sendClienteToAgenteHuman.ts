import 'dotenv/config';
import { enviarDadosDoCliente, LeadRegister } from "../../adapters/backend"

export const sendClienteToAgenteHuman = async (dados: LeadRegister) => {
    try {
        await enviarDadosDoCliente({
            name_template: "",
            dados
        });
        return true;
    } catch (e: any) {
        console.log(e)
        return false;
    }
}