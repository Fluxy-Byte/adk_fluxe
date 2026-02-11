import 'dotenv/config';
import { enviarDadosDoCliente, LeadRegister } from "../../adapters/backend"

export const sendClienteToAgenteHuman = async (dados: LeadRegister) => {
    try {

        
        
        enviarDadosDoCliente({
            name_template: "chegou_mais_um_lead",
            dados
        });

        return true;
    } catch (e: any) {
        console.log(e)
        return false;
    }
}