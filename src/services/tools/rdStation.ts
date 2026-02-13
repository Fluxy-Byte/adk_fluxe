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

interface RdTokenResponse {
  access_token?: string;
  token?: string;
  refresh_token?: string;
  [key: string]: unknown;
}

async function requestToken(tokenBy: 'code' | 'refresh_token', body: URLSearchParams): Promise<RdTokenResponse> {
  // refresh flow usa /auth/token sem token_by; adiciona grant_type para compatibilidade
  if (tokenBy === 'refresh_token' && !body.get('grant_type')) {
    body.append('grant_type', 'refresh_token');
  }

  const url =
    tokenBy === 'refresh_token'
      ? `${RD_API_BASE}/auth/token`
      : `${RD_API_BASE}/auth/token?token_by=${tokenBy}`;

  const { data } = await axios.post<RdTokenResponse>(url, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    }
  });

  return data;
}

async function getToken(): Promise<string> {
  const staticToken = process.env.RD_ACCESS_TOKEN ?? process.env.RD_API_TOKEN;
  const clientId = process.env.RD_CLIENT_ID;
  const clientSecret = process.env.RD_CLIENT_SECRET;
  const code = process.env.RD_CODE;
  const refreshToken = process.env.RD_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Credenciais da RD Station ausentes. Configure RD_ACCESS_TOKEN/RD_API_TOKEN ou RD_CLIENT_ID e RD_CLIENT_SECRET no ambiente.'
    );
  }

  let data: RdTokenResponse | null = null;

  // tenta sempre renovar se houver refresh token disponível
  if (refreshToken && refreshToken !== 'refresh_token_aqui') {
    const refreshBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    });

    try {
      data = await requestToken('refresh_token', refreshBody);
    } catch (error) {
      if (!code && !staticToken) {
        throw error;
      }
    }
  }

  if (!data) {
    if (!code) {
      throw new Error(
        'RD_CODE ausente. Configure RD_CODE para o primeiro token ou RD_REFRESH_TOKEN para renovação.'
      );
    }

    const codeBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code
    });

    data = await requestToken('code', codeBody);
  }

  // fallback: usa token estático se definido (pode expirar)
  if (!data && staticToken && staticToken !== 'token_aqui') {
    return staticToken;
  }

  const token = data.access_token ?? data.token;

  if (!token) {
    throw new Error('RD Station não retornou access_token na geração do token.');
  }

  return token;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}

function isNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

const RETRYABLE_STATUS = [500, 502, 503, 504];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (retries > 0 && status && RETRYABLE_STATUS.includes(status)) {
      await sleep(delayMs);
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

async function fetchContactByEmail(email: string, token: string): Promise<RdContactResponse | null> {
  try {
    const url = `${RD_API_BASE}/platform/contacts/email/${encodeURIComponent(email)}`;
    const { data } = await withRetry(() => axios.get(url, { headers: authHeaders(token) }));
    return data;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function createContact(payload: RdLeadPayload, token: string): Promise<RdContactResponse> {
  const body: Record<string, unknown> = {
    email: payload.email,
    name: payload.name,
    mobile_phone: payload.phone
  };

  console.log('[RD_STATION] create contact payload', body);

  const url = `${RD_API_BASE}/platform/contacts`;
  const { data } = await withRetry(() => axios.post(url, body, { headers: authHeaders(token) }));
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

  const { data } = await withRetry(() => axios.post(url, body, { headers: authHeaders(token) }));
  return data;
}

export async function createLeadInRdMarketing(payload: RdLeadPayload) {
  const token = await getToken();
  const pipelineId = payload.pipelineId ?? process.env.RD_PIPELINE_ID;
  const stageId = payload.stageId ?? process.env.RD_STAGE_ID;

  const isValidId = (value?: string) => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return !['id_da_pipeline', 'id_do_stage', 'pipeline_id', 'stage_id', 'undefined', 'null'].includes(normalized);
  };

  const shouldCreateDeal = isValidId(pipelineId) && isValidId(stageId);

  try {
    let contact: RdContactResponse | null = null;

    // Tenta criar contato; se já existir (409), busca pelo email
    try {
      contact = await createContact(payload, token);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const alreadyExists =
        axios.isAxiosError(error) &&
        Array.isArray((error.response?.data as any)?.errors) &&
        (error.response?.data as any).errors.some(
          (e: any) => e?.error_type === 'EMAIL_ALREADY_IN_USE' || e?.error_type === 'CONTACT_ALREADY_EXISTS'
        );

      if (status === 409 || alreadyExists) {
        contact = await fetchContactByEmail(payload.email, token);
      } else {
        throw error;
      }
    }

    // Caso não tenha conseguido criar nem buscar, falha.
    if (!contact) {
      throw new Error('RD Station não retornou contato (criação ou busca falhou).');
    }

    const contactId = (contact as any).uuid ?? (contact as any).id;

    if (!contactId) {
      throw new Error('RD Station não retornou identificador do contato.');
    }

    let deal: RdDealResponse | null = null;

    if (shouldCreateDeal) {
      deal = await createDeal(contactId, payload, token, pipelineId as string, stageId as string);
    }

    return {
      success: true,
      contact,
      deal
    };
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        }
      : (error as Error).message;

    console.error('[RD_STATION_LEAD_ERROR]', message);

    return {
      success: false,
      error: message
    };
  }
}
