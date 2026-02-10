import { prisma } from '../../lib/prisma'

export interface Contato {
    id: number;
    email: string | null;
    name: string | null;
    phone: string;
    start_date_conversation: Date;
    last_date_conversation: Date | null;
    pipeline_user: string;
}

async function verificandoExistencia(phone: string) {
    return await prisma.contato.findFirst({
        where: {
            phone
        }
    })
}

async function updateDateLastMessage(phone: string) {
    await prisma.contato.update({
        where: {
            phone: phone
        },
        data: {
            last_date_conversation: new Date()
        }
    });
}

async function criarUsuario(phone: string) {
    return await prisma.contato.create({
        data: {
            phone
        }
    })
}

export async function contato(phone: string) {
    try {
        let user = await verificandoExistencia(phone);

        if (!user) {
            user = await criarUsuario(phone);
        }

        updateDateLastMessage(phone);

        return {
            status: true,
            user
        };

    } catch (e) {
        console.error('Erro ao gerar usuário:', e);

        return {
            status: false,
            user: null
        };
    }
}


export async function getAllContacts() {
    return await prisma.contato.findMany();
}

export async function updateNameLead(phone: string, name: string) {
    return await prisma.contato.update({
        where: {
            phone
        },
        data: {
            name
        }
    })
}