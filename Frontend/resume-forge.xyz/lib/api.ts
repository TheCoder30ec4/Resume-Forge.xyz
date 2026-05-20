const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Try to refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      const retried = await fetch(`${BASE}${path}`, { ...options, headers });
      if (!retried.ok) throw new ApiError(retried.status, await retried.text());
      return retried.json() as Promise<T>;
    }
    // Refresh failed — clear tokens
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/signin";
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {}
    throw new ApiError(res.status, detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export async function register(email: string, password: string, name?: string): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  }, false);
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, false);
}

export async function logout(): Promise<void> {
  await request<void>("/auth/logout", { method: "POST" });
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function googleLoginUrl(): string {
  return `${BASE}/auth/google`;
}

export function githubLoginUrl(): string {
  const token = getToken() ?? "";
  return `${BASE}/auth/github?access_token=${encodeURIComponent(token)}`;
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  full_name: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[] | null;
  is_fresher: boolean;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  auth_provider: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  profile: UserProfile | null;
}

export async function getMe(): Promise<User> {
  return request<User>("/users/me");
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return request<UserProfile>("/users/me/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function connectLinkedin(linkedin_url: string): Promise<{ message: string; public_id: string }> {
  return request("/users/me/linkedin", {
    method: "POST",
    body: JSON.stringify({ linkedin_url }),
  });
}

export async function connectGithub(code: string): Promise<{ message: string; username: string }> {
  return request("/users/me/github", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export interface GithubRepo {
  full_name: string;
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  pushed_at: string;
  private: boolean;
}

export async function listGithubRepos(): Promise<GithubRepo[]> {
  return request<GithubRepo[]>("/users/me/github/repos");
}

export async function getCandidateData(): Promise<Record<string, unknown> | null> {
  return request("/users/me/candidate-data");
}

// ── Resume Sessions ───────────────────────────────────────────────────────────

export interface ResumeVersion {
  id: string;
  version_number: number;
  user_input: string | null;
  resume_draft: Record<string, unknown> | null;
  ats_score: number;
  ats_report: Record<string, unknown> | null;
  is_approved: boolean;
  created_at: string;
}

export interface ResumeSession {
  id: string;
  session_id: string;
  jd_text: string;
  jd_url: string | null;
  selected_github_repos: string[];
  theme: string;
  user_input: string | null;
  ats_score: number;
  ats_attempts: number;
  status: "pending" | "running" | "done" | "error";
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  versions: ResumeVersion[];
}

export async function startResume(data: {
  jd_text: string;
  jd_url?: string;
  selected_github_repos: string[];
  theme: string;
  user_input?: string;
}): Promise<ResumeSession> {
  return request<ResumeSession>("/resume/start", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function reviseResume(session_id: string, user_input: string): Promise<ResumeSession> {
  return request<ResumeSession>(`/resume/${session_id}/revise`, {
    method: "POST",
    body: JSON.stringify({ user_input }),
  });
}

export async function getSession(session_id: string): Promise<ResumeSession> {
  return request<ResumeSession>(`/resume/${session_id}`);
}

export async function listSessions(): Promise<ResumeSession[]> {
  return request<ResumeSession[]>("/resume/");
}

export async function approveVersion(session_id: string, version_id: string): Promise<{ message: string; pdf_path: string }> {
  return request(`/resume/${session_id}/approve`, {
    method: "POST",
    body: JSON.stringify({ version_id }),
  });
}

export async function updateDraft(
  session_id: string,
  version_id: string,
  resume_draft: Record<string, unknown>
): Promise<ResumeVersion> {
  return request<ResumeVersion>(`/resume/${session_id}/versions/${version_id}/draft`, {
    method: "PATCH",
    body: JSON.stringify({ resume_draft }),
  });
}

export function pdfUrl(session_id: string, version_id: string): string {
  const token = getToken();
  return `${BASE}/resume/${session_id}/versions/${version_id}/pdf?token=${token}`;
}
