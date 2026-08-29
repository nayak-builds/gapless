import { createSupabaseBrowserClient } from "@/lib/supabase";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function apiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "http://localhost:8000";
  return base.replace(/\/$/, "");
}

async function authHeader(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new ApiError("You are not signed in", 401);
  }
  return `Bearer ${token}`;
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const record = payload as { error?: unknown; detail?: unknown };
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error;
  }
  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
  }
  return fallback;
}

export function toUserMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return err.message || "Too many requests. Wait a minute and try again.";
    }
    if (err.status === 401) {
      return "You are not signed in. Refresh the page and sign in again.";
    }
    if (err.status === 0) {
      return err.message || fallback;
    }
    if (err.status >= 500) {
      return fallback;
    }
    return err.message || fallback;
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        Authorization: await authHeader(),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Couldn't reach the server. Check your connection and try again.",
      0,
    );
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      messageFromPayload(payload, "Request failed"),
      response.status,
    );
  }

  return payload as T;
}

export type ExtractedSkill = {
  name: string;
  importance: "required" | "nice-to-have";
};

export type ParseJdResponse = {
  jd_id: string;
  seniority: string;
  skills: ExtractedSkill[];
};

export type GapSkill = {
  name: string;
  gap_level: string;
};

export type ComputeGapsResponse = {
  matched: GapSkill[];
  missing: GapSkill[];
};

export async function getOwnedSkills(): Promise<string[]> {
  const data = await request<{ skills: string[] }>("/skills/owned");
  return data.skills;
}

export async function saveOwnedSkills(skills: string[]): Promise<string[]> {
  const data = await request<{ skills: string[] }>("/skills/owned", {
    method: "POST",
    body: JSON.stringify({ skills }),
  });
  return data.skills;
}

export async function parseJd(rawText: string): Promise<ParseJdResponse> {
  return request<ParseJdResponse>("/jd/parse", {
    method: "POST",
    body: JSON.stringify({ raw_text: rawText }),
  });
}

export async function computeGaps(jdId: string): Promise<ComputeGapsResponse> {
  return request<ComputeGapsResponse>("/gaps/compute", {
    method: "POST",
    body: JSON.stringify({ jd_id: jdId }),
  });
}

export type ApplicationStatus =
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected";

export type Application = {
  id: string;
  jd_id: string;
  status: ApplicationStatus;
  applied_at: string;
  company: string | null;
  role_title: string | null;
};

export async function listApplications(): Promise<Application[]> {
  const data = await request<{ applications: Application[] }>("/applications");
  return data.applications;
}

export async function createApplication(jdId: string): Promise<Application> {
  return request<Application>("/applications", {
    method: "POST",
    body: JSON.stringify({ jd_id: jdId }),
  });
}

export async function patchApplication(
  id: string,
  status: ApplicationStatus,
): Promise<Application> {
  return request<Application>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteApplication(id: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/applications/${id}`, {
    method: "DELETE",
  });
}
