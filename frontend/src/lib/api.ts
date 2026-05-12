export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Baby {
  id: number;
  user_id: number;
  name: string;
  birth_date: string;
  gender: "male" | "female";
  feeding_type: string;
  hospital: string | null;
  relation: string;
  created_at: string;
}

export interface Expense {
  id: number;
  baby_id: number;
  member_id: number | null;
  category: string;
  amount: number;
  name: string;
  channel: string | null;
  date: string;
  created_at: string;
}

export interface BabyRecord {
  id: number;
  baby_id: number;
  member_id: number | null;
  type: string;
  data: string;
  recorded_at: string;
  created_at: string;
}

export interface AuthData {
  token: string;
  user: { id: number; phone: string; name: string | null };
}

export interface FamilyMember {
  id: number;
  family_id: number;
  user_id: number;
  role: string;
  nickname: string;
  avatar_emoji: string;
  phone: string | null;
  user_name: string | null;
  created_at: string;
}

export interface Family {
  id: number;
  name: string;
  invite_code: string;
  created_at: string;
}

const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.message || "请求失败");
  }
  return json;
}

export async function login(phone: string, password: string): Promise<AuthData> {
  const res = await request<AuthData>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
  return res.data;
}

export async function register(phone: string, password: string, name?: string): Promise<AuthData> {
  const res = await request<AuthData>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ phone, password, name }),
  });
  return res.data;
}

export async function getMe(): Promise<unknown> {
  const res = await request<unknown>("/auth/me");
  return res.data;
}

export async function fetchBabies(): Promise<Baby[]> {
  const res = await request<Baby[]>("/babies");
  return res.data;
}

export async function createBaby(data: {
  name: string;
  birth_date: string;
  gender: "male" | "female";
  feeding_type?: string;
  hospital?: string;
  relation?: string;
}): Promise<Baby> {
  const res = await request<Baby>("/babies", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateBaby(id: number, data: {
  name?: string;
  birth_date?: string;
  gender?: "male" | "female";
  feeding_type?: string;
  hospital?: string;
}): Promise<Baby> {
  const res = await request<Baby>(`/babies/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function fetchExpenses(babyId: number, month?: string): Promise<Expense[]> {
  const params = new URLSearchParams({ baby_id: String(babyId) });
  if (month) params.set("month", month);
  const res = await request<Expense[]>(`/expenses?${params}`);
  return res.data;
}

export async function createExpense(data: {
  baby_id: number;
  member_id?: number;
  category: string;
  amount: number;
  name: string;
  channel?: string;
  date: string;
}): Promise<Expense> {
  const res = await request<Expense>("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function fetchRecords(babyId: number, date?: string, type?: string): Promise<BabyRecord[]> {
  const params = new URLSearchParams({ baby_id: String(babyId) });
  if (date) params.set("date", date);
  if (type) params.set("type", type);
  const res = await request<BabyRecord[]>(`/records?${params}`);
  return res.data;
}

export async function createRecord(data: {
  baby_id: number;
  member_id?: number;
  type: string;
  data: Record<string, unknown>;
  recorded_at?: string;
}): Promise<BabyRecord> {
  const res = await request<BabyRecord>("/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function fetchFamily(): Promise<{ family: Family | null; members: FamilyMember[] }> {
  const res = await request<{ family: Family | null; members: FamilyMember[] }>("/family");
  return res.data;
}

export async function createFamily(data: {
  baby_id: number;
  relation: string;
  name?: string;
}): Promise<Family> {
  const res = await request<Family>("/family/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function inviteFamilyMember(data: {
  relation: string;
  name?: string;
}): Promise<{ invite_code: string; relation: string; name?: string }> {
  const res = await request<{ invite_code: string; relation: string; name?: string }>("/family/invite", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function joinFamily(data: {
  invite_code: string;
  relation?: string;
}): Promise<{ family: Family }> {
  const res = await request<{ family: Family }>("/family/join", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function removeFamilyMember(memberId: number): Promise<{ id: number }> {
  const res = await request<{ id: number }>(`/family/members/${memberId}`, {
    method: "DELETE",
  });
  return res.data;
}
