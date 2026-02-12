import axios from 'axios';

export interface RdLeadPayload {
  email: string;
  name?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  tags?: string[];
  dealName?: string;
  amount?: number;
  pipelineId?: string;
  stageId?: string;
}

interface RdContactResponse {
  uuid: string;
  [key: string]: unknown;
}

interface RdDealResponse {
  uuid?: string;
  id?: string | number;
  [key: string]: unknown;
}

const RD_API_BASE = process.env.RD_API_BASE ?? 'https://api.rd.services';

function getToken(): string {
  const token = process.env.RD_ACCESS_TOKEN ?? process.env.RD_API_TOKEN;
  if (!token) {
    throw new Error('Token da RD Station ausente. Configure RD_ACCESS_TOKEN ou RD_API_TOKEN no ambiente.');
  }
  return token;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

function isNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

async function fetchContactByEmail(email: string, token: string): Promise<RdContactResponse | null> {
  try {
    const url = `${RD_API_BASE}/platform/contacts/email/${encodeURIComponent(email)}`;
    const { data } = await axios.get(url, { headers: authHeaders(token) });
    return data;
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

async function createContact(payload: RdLeadPayload, token: string): Promise<RdContactResponse> {
  const body: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
    job_title: payload.jobTitle,
    company_name: payload.companyName,
    tags: payload.tags,
    legal_bases: [
      {
        category: 'communications',
        type: 'consent',
        status: 'granted'
      }
    ]
  };

  if (payload.phone) {
    body.phones = [
      {
        type: 'mobile',
        number: payload.phone
      }
    ];
  }

  const url = `${RD_API_BASE}/platform/contacts`;
  const { data } = await axios.post(url, body, { headers: authHeaders(token) });
  return data;
}

async function createDeal(
  contactId: string,
  payload: RdLeadPayload,
  token: string,
  pipelineId: string,
  stageId: string
): Promise<RdDealResponse> {
  const url = `${RD_API_BASE}/crm/deals`;

  const body: Record<string, unknown> = {
    deal: {
      name: payload.dealName ?? payload.name ?? payload.email,
      contact_id: contactId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      amount: payload.amount
    }
  };

  const { data } = await axios.post(url, body, { headers: authHeaders(token) });
  return data;
}

export async function createLeadInRdMarketing(payload: RdLeadPayload) {
  const token = getToken();
  const pipelineId = payload.pipelineId ?? process.env.RD_PIPELINE_ID;
  const stageId = payload.stageId ?? process.env.RD_STAGE_ID;

  if (!pipelineId || !stageId) {
    throw new Error('RD_PIPELINE_ID ou RD_STAGE_ID não configurados no ambiente.');
  }

  try {
    const existing = await fetchContactByEmail(payload.email, token);
    const contact = existing ?? (await createContact(payload, token));
    const contactId = (contact as any).uuid ?? (contact as any).id;

    if (!contactId) {
      throw new Error('RD Station não retornou identificador do contato.');
    }

    const deal = await createDeal(contactId, payload, token, pipelineId, stageId);

    return {
      success: true,
      contact,
      deal
    };
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data ?? error.message
      : (error as Error).message;

    console.error('[RD_STATION_LEAD_ERROR]', message);

    return {
      success: false,
      error: message
    };
  }
}
