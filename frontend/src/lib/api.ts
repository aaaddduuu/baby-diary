import { normalizeWeightKg } from "./growth";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Baby {
  id: number;
  user_id: number;
  family_id: number | null;
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
  direction: "expense" | "income";
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
  user_id: number | null;
  member_id: number | null;
  type: string;
  data: string;
  recorded_at: string;
  created_at: string;
  user_name?: string | null;
  member_nickname?: string | null;
  avatar_emoji?: string | null;
}

export interface MomentPhoto {
  id: number;
  moment_id: number;
  content_type: string;
  size_bytes: number;
  sort_order: number;
  created_at: string;
  path: string;
}

export interface DailyMoment {
  id: number;
  baby_id: number;
  user_id: number;
  entry_date: string;
  note: string;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  member_nickname: string | null;
  avatar_emoji: string | null;
  photos: MomentPhoto[];
}

export type MomentShareStatus = "active" | "expired" | "revoked";

export interface MomentShare {
  id: number;
  baby_id: number;
  created_by: number;
  share_month: string;
  expires_on: string;
  revoked_at: string | null;
  created_at: string;
  status: MomentShareStatus;
}

export interface CreatedMomentShare extends MomentShare {
  token: string;
}

export interface SharedMoment {
  id: number;
  entry_date: string;
  note: string;
  baby_day: number;
  photos: MomentPhoto[];
}

export interface SharedMomentsData {
  baby_name: string;
  share_month: string;
  expires_on: string;
  moments: SharedMoment[];
}

export interface AuthData {
  token: string;
  user: { id: number; phone: string; name: string | null };
  onboarding_required?: boolean;
  baby?: Baby | null;
}

export interface RegisterInput {
  phone: string;
  password: string;
  name?: string;
  invite_code?: string;
  relation?: string;
}

export interface UserProfile {
  id: number;
  phone: string;
  name: string | null;
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

export interface GrowthRecord {
  id: number;
  weight: number | null;
  height: number | null;
  head_circumference: number | null;
  measured_at: string;
}

function normalizeGrowthRecord(record: GrowthRecord): GrowthRecord {
  return {
    ...record,
    weight: normalizeWeightKg(record.weight),
  };
}

export interface VaccineRecord {
  id: number;
  name: string;
  status: "planned" | "completed";
  date: string | null;
  hospital: string | null;
  is_custom: number;
}

export type VoiceParseStatus = "parsed" | "partial" | "unsupported" | "unrecognized";

export type VoiceCandidateType =
  | "breast_milk"
  | "breast_milk_bottle"
  | "formula"
  | "sleep"
  | "temperature"
  | "diaper"
  | "medicine"
  | "jaundice"
  | "cord_care"
  | "bath_touch";

export interface VoiceParseCandidate {
  type: VoiceCandidateType;
  recorded_at: string;
  data: Record<string, unknown>;
}

export interface VoiceParseResult {
  status: VoiceParseStatus;
  transcript: string;
  candidate?: VoiceParseCandidate;
  missing_fields?: string[];
  confidence: number;
  message: string;
}

function getApiBase() {
  if (import.meta.env.VITE_API_URL) return `${import.meta.env.VITE_API_URL}/api`;
  return "/api";
}

const BASE = getApiBase();

export function getApiAssetUrl(path: string): string {
  return `${BASE}${path}`;
}

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

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth";
    throw new Error("登录已过期");
  }

  const text = await res.text();
  if (!text) {
    throw new Error(`接口无响应：${res.status} ${res.statusText || ""}`.trim());
  }

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error("接口返回格式异常，请刷新后重试");
  }

  if (!json.success) {
    throw new Error(json.message || "请求失败");
  }
  return json;
}

async function requestData<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await request<T>(url, options);
  return res.data;
}

export async function login(phone: string, password: string): Promise<AuthData> {
  const res = await request<AuthData>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
  return res.data;
}

export async function register(data: RegisterInput): Promise<AuthData> {
  const res = await request<AuthData>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function getMe(): Promise<unknown> {
  const res = await request<unknown>("/auth/me");
  return res.data;
}

export async function updateProfile(data: { name: string }): Promise<UserProfile> {
  const res = await request<UserProfile>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
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
  direction?: "expense" | "income";
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

export async function parseVoiceRecord(data: {
  baby_id: number;
  transcript: string;
  recorded_at_context: string;
  recognition_started_at: string;
}): Promise<VoiceParseResult> {
  return requestData<VoiceParseResult>("/records/voice-parse", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchRecordById(recordId: number): Promise<BabyRecord> {
  return requestData<BabyRecord>(`/records/${recordId}`);
}

export async function updateRecord(
  recordId: number,
  data: {
    type: string;
    data: Record<string, unknown>;
    recorded_at?: string;
  },
): Promise<BabyRecord> {
  return requestData<BabyRecord>(`/records/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRecord(recordId: number): Promise<{ id?: number }> {
  return requestData<{ id?: number }>(`/records/${recordId}`, {
    method: "DELETE",
  });
}

export async function fetchMoments(babyId: number, month?: string): Promise<DailyMoment[]> {
  const params = new URLSearchParams({ baby_id: String(babyId), limit: "120" });
  if (month) params.set("month", month);
  return requestData<DailyMoment[]>(`/moments?${params}`);
}

export async function fetchMoment(momentId: number): Promise<DailyMoment> {
  return requestData<DailyMoment>(`/moments/${momentId}`);
}

export async function createMoment(data: {
  baby_id: number;
  entry_date: string;
  note: string;
}): Promise<DailyMoment> {
  return requestData<DailyMoment>("/moments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMoment(momentId: number, data: {
  entry_date: string;
  note: string;
}): Promise<DailyMoment> {
  return requestData<DailyMoment>(`/moments/${momentId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMoment(momentId: number): Promise<{ id: number }> {
  return requestData<{ id: number }>(`/moments/${momentId}`, { method: "DELETE" });
}

export async function fetchMomentShares(babyId: number): Promise<MomentShare[]> {
  return requestData<MomentShare[]>(`/moment-shares?baby_id=${babyId}`);
}

export async function createMomentShare(data: {
  baby_id: number;
  share_month: string;
  expires_on: string;
}): Promise<CreatedMomentShare> {
  return requestData<CreatedMomentShare>("/moment-shares", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function revokeMomentShare(shareId: number): Promise<{ id: number }> {
  return requestData<{ id: number }>(`/moment-shares/${shareId}`, { method: "DELETE" });
}

export async function fetchSharedMoments(token: string): Promise<SharedMomentsData> {
  return requestData<SharedMomentsData>(`/shared-moments/${token}`);
}

export async function uploadMomentPhoto(momentId: number, photo: Blob): Promise<MomentPhoto> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/moments/${momentId}/photos`, {
    method: "POST",
    headers: {
      "Content-Type": photo.type || "image/jpeg",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: photo,
  });
  const text = await res.text();
  let json: ApiResponse<MomentPhoto>;
  try {
    json = JSON.parse(text) as ApiResponse<MomentPhoto>;
  } catch {
    throw new Error("媒体上传响应异常");
  }
  if (!json.success) throw new Error(json.message || "媒体上传失败");
  return json.data;
}

export async function deleteMomentPhoto(photoId: number): Promise<{ id: number }> {
  return requestData<{ id: number }>(`/moments/photos/${photoId}`, { method: "DELETE" });
}

export async function fetchPrivatePhoto(path: string): Promise<Blob> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth";
    throw new Error("登录已过期");
  }
  if (!res.ok) throw new Error("媒体加载失败");
  return res.blob();
}

export async function fetchGrowthRecords(babyId: number): Promise<GrowthRecord[]> {
  const records = await requestData<GrowthRecord[]>(`/babies/${babyId}/growth`);
  return records.map(normalizeGrowthRecord);
}

export async function createGrowthRecord(
  babyId: number,
  data: {
    weight: number | null;
    height: number | null;
    head_circumference: number | null;
    measured_at: string;
  },
): Promise<GrowthRecord> {
  const record = await requestData<GrowthRecord>(`/babies/${babyId}/growth`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeGrowthRecord(record);
}

export async function updateGrowthRecord(
  babyId: number,
  recordId: number,
  data: {
    weight: number | null;
    height: number | null;
    head_circumference: number | null;
    measured_at: string;
  },
): Promise<GrowthRecord> {
  const record = await requestData<GrowthRecord>(`/babies/${babyId}/growth/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return normalizeGrowthRecord(record);
}

export async function deleteGrowthRecord(babyId: number, recordId: number): Promise<{ id?: number }> {
  return requestData<{ id?: number }>(`/babies/${babyId}/growth/${recordId}`, {
    method: "DELETE",
  });
}

export async function fetchVaccines(babyId: number): Promise<VaccineRecord[]> {
  return requestData<VaccineRecord[]>(`/babies/${babyId}/vaccines`);
}

export async function createVaccine(
  babyId: number,
  data: {
    name: string;
    status: "planned" | "completed";
    date: string | null;
    hospital: string | null;
    is_custom: boolean | number;
  },
): Promise<VaccineRecord> {
  return requestData<VaccineRecord>(`/babies/${babyId}/vaccines`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateVaccine(
  babyId: number,
  vaccineId: number,
  data: {
    name?: string;
    status?: "planned" | "completed";
    date?: string | null;
    hospital?: string | null;
  },
): Promise<VaccineRecord> {
  return requestData<VaccineRecord>(`/babies/${babyId}/vaccines/${vaccineId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteVaccine(babyId: number, vaccineId: number): Promise<{ id?: number }> {
  return requestData<{ id?: number }>(`/babies/${babyId}/vaccines/${vaccineId}`, {
    method: "DELETE",
  });
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
}): Promise<{ family: Family; baby: Baby | null }> {
  const res = await request<{ family: Family; baby: Baby | null }>("/family/join", {
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
