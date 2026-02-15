import axios from 'axios';

type LegalBasisStatus = 'granted' | 'revoked' | 'denied' | string;

type LegalBasisCategory = 'communications' | 'personalization' | 'sales' | string;

type LegalBasisType = 'consent' | 'contract' | 'legitimate_interest' | string;

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
  ownerId?: string;
  customFields?: Record<string, unknown>;
  legalBases?: Array<{
    category: LegalBasisCategory;
    type: LegalBasisType;
    status: LegalBasisStatus;
  }>;
  status?: 'ongoing' | 'won' | 'lost';
  rating?: number; // 1-3 (pontos de qualificação do RD)
  expectedCloseDate?: string; // YYYY-MM-DD
}

interface RdContactResponse {
  id?: string;
  uuid?: string;
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

  // Prioriza token fixo quando fornecido
  if (staticToken && staticToken !== 'token_aqui') {
    return staticToken;
  }

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

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function buildContactBody(payload: RdLeadPayload) {
  const contact: Record<string, unknown> = {
    name: payload.name ?? payload.email,
    job_title: payload.jobTitle,
    emails: [{ email: payload.email }]
  };

  if (payload.phone) {
    contact.phones = [{ phone: payload.phone, type: 'mobile' }];
  }

  if (payload.customFields) {
    contact.custom_fields = payload.customFields;
  }

  if (payload.legalBases?.length) {
    contact.legal_bases = payload.legalBases;
  }

  return { data: contact };
}

async function fetchContactByEmail(email: string, token: string): Promise<RdContactResponse | null> {
  try {
    const filter = encodeURIComponent(`email:"${email}"`);
    const url = `${RD_API_BASE}/crm/v2/contacts?filter=${filter}&limit=1`;
    console.log('[RD] fetchContactByEmail', url);
    const { data } = await withRetry(() => axios.get(url, { headers: authHeaders(token) }));
    const contact = (data as any)?.data?.[0] ?? null;
    console.log('[RD] fetchContactByEmail result', contact?.id ?? contact?.uuid ?? 'not-found');
    return contact;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function createContact(payload: RdLeadPayload, token: string): Promise<RdContactResponse> {
  const body = buildContactBody(payload);
  const url = `${RD_API_BASE}/crm/v2/contacts`;
  console.log('[RD] createContact payload', body);
  const { data } = await withRetry(() => axios.post(url, body, { headers: authHeaders(token) }));
  const contact = (data as any)?.data ?? data;
  console.log('[RD] createContact result', (contact as any)?.id ?? (contact as any)?.uuid);
  return contact;
}

async function updateContact(contactId: string, payload: RdLeadPayload, token: string): Promise<RdContactResponse> {
  const body = buildContactBody(payload);
  const url = `${RD_API_BASE}/crm/v2/contacts/${contactId}`;
  console.log('[RD] updateContact payload', { contactId, body });
  const { data } = await withRetry(() => axios.put(url, body, { headers: authHeaders(token) }));
  const contact = (data as any)?.data ?? data;
  console.log('[RD] updateContact result', (contact as any)?.id ?? (contact as any)?.uuid);
  return contact;
}

async function createDeal(
  contactId: string,
  payload: RdLeadPayload,
  token: string,
  pipelineId: string,
  stageId: string,
  ownerId?: string
): Promise<RdDealResponse> {
  const url = `${RD_API_BASE}/crm/v2/deals`;

  console.log('[RD] createDeal input', {
    contactId,
    pipelineId,
    stageId,
    ownerId,
    name: payload.dealName ?? payload.name ?? payload.email,
    amount: payload.amount,
    rating: payload.rating,
    expected_close_date: payload.expectedCloseDate,
    custom_fields: payload.customFields
  });

  const deal: Record<string, unknown> = {
    name: payload.dealName ?? payload.name ?? payload.email,
    contact_ids: [contactId],
    pipeline_id: pipelineId,
    stage_id: stageId,
    status: payload.status ?? 'ongoing',
    amount: payload.amount,
    rating: payload.rating,
    expected_close_date: payload.expectedCloseDate
  };

  if (ownerId) {
    deal.owner_id = ownerId;
  }

  if (payload.customFields) {
    deal.custom_fields = payload.customFields;
  }

  const body = { data: deal };

  console.log('[RD] createDeal payload', body);
  const { data } = await withRetry(() => axios.post(url, body, { headers: authHeaders(token) }));
  const created = (data as any)?.data ?? data;
  console.log(
    '[RD] createDeal result',
    (created as any)?.id ?? (created as any)?.uuid,
    'contact_id',
    (created as any)?.contact_id ?? (created as any)?.contact_ids
  );
  return created;
}

async function ensureDealContact(
  dealId: string,
  contactId: string,
  token: string
): Promise<RdDealResponse> {
  const url = `${RD_API_BASE}/crm/v2/deals/${dealId}`;
  const body = { data: { contact_ids: [contactId] } };
  console.log('[RD] ensureDealContact payload', body);
  const { data } = await withRetry(() => axios.put(url, body, { headers: authHeaders(token) }));
  const updated = (data as any)?.data ?? data;
  console.log(
    '[RD] ensureDealContact result',
    (updated as any)?.id ?? dealId,
    'contact_id',
    (updated as any)?.contact_id ?? (updated as any)?.contact_ids
  );
  return updated;
}

export async function createLeadInRdMarketing(payload: RdLeadPayload) {
  const token = await getToken();
  const pipelineId = payload.pipelineId ?? process.env.RD_PIPELINE_ID;
  const stageId = payload.stageId ?? process.env.RD_STAGE_ID;
  const ownerId = payload.ownerId ?? process.env.RD_OWNER_ID;

  const isValidId = (value?: string) => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return !['id_da_pipeline', 'id_do_stage', 'pipeline_id', 'stage_id', 'undefined', 'null'].includes(normalized);
  };

  const shouldCreateDeal = isValidId(pipelineId) && isValidId(stageId);

  // Defaults para melhorar o card do negócio
  const enrichedPayload: RdLeadPayload = { ...payload };

  console.log('[RD] incoming payload', payload);

  if (enrichedPayload.rating == null) {
    const urg = (payload as any).urgenciaLead ?? (payload as any).urgencia;
    enrichedPayload.rating = urg === 'alta' ? 3 : urg === 'media' ? 2 : 1;
  }

  if (!enrichedPayload.expectedCloseDate) {
    enrichedPayload.expectedCloseDate = formatDate(addDays(new Date(), 14));
  }

  try {
    let contact: RdContactResponse | null = null;

    // Look up by email; create if missing, update if already exists
    contact = await fetchContactByEmail(enrichedPayload.email, token);

    if (!contact) {
      contact = await createContact(enrichedPayload, token);
    } else if (contact.id || contact.uuid) {
      const contactId = (contact as any).id ?? (contact as any).uuid;
      contact = await updateContact(contactId, enrichedPayload, token);
    }

    if (!contact) {
      throw new Error('RD Station nao retornou contato (criacao ou busca falhou).');
    }

    const contactId = (contact as any).id ?? (contact as any).uuid;

    if (!contactId) {
      throw new Error('RD Station nao retornou identificador do contato.');
    }

    let deal: RdDealResponse | null = null;

    if (shouldCreateDeal) {
      deal = await createDeal(contactId, enrichedPayload, token, pipelineId as string, stageId as string, ownerId);

      // Se por algum motivo o contato não veio associado, força a associação
      const dealId = (deal as any)?.id ?? (deal as any)?.uuid;
      const hasContact =
        (deal as any)?.contact_id === contactId ||
        ((deal as any)?.contact_ids ?? []).includes(contactId);

      if (dealId && !hasContact) {
        deal = await ensureDealContact(dealId as string, contactId, token);
      }
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

    console.error('[RD_STATION_LEAD_ERROR]', JSON.stringify(message, null, 2));

    return {
      success: false,
      error: message
    };
  }
}
