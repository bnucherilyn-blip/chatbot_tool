export interface CharacterInput {
  key: string;
  name: string;
  gender: string;
  age: string;
  role_type: string;
  personality: string;
  occupation: string;
  scenario: string;
  language: string;
}

export interface CharacterResult {
  name: string;
  gender: string;
  age: string;
  role_type: string;
  personality: string;
  occupation: string;
  scenario: string;
  language: string;
  persona_prompt: string;
  introduction: string;
  prologue: string;
  status: string;
  error: string;
}

export interface PromptConfig {
  persona_prompt: string;
  intro_prompt: string;
}

export interface ModelConfig {
  base_url: string;
  model: string;
  api_key: string;
}

export interface ModelTestResult {
  ok: boolean;
  request_url: string;
  model: string;
  message?: string;
  error?: string;
}

export interface LoginResult {
  ok: boolean;
  token: string;
  username: string;
}

const BASE_URL = "";
const AUTH_TOKEN_STORAGE_KEY = "chatbot-tool-auth-token";

export function getStoredAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

export function setStoredAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function authHeaders(): HeadersInit {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonResponse<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let detail = "请求失败";
    try {
      const data = await resp.json();
      detail = data.detail || detail;
    } catch {
      detail = resp.statusText || detail;
    }
    throw new Error(detail);
  }
  return resp.json();
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const resp = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return parseJsonResponse<LoginResult>(resp);
}

export async function generateCharacters(
  characters: CharacterInput[],
  promptConfig: PromptConfig,
  modelConfig: ModelConfig,
  onProgress: (index: number, total: number, result: CharacterResult) => void
): Promise<void> {
  const payload = characters.map(({ name, gender, age, role_type, personality, occupation, scenario, language }) => ({
    name, gender, age, role_type, personality, occupation, scenario, language,
  }));

  const resp = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      characters: payload,
      prompt_config: promptConfig,
      model_config: modelConfig,
    }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(resp.status === 401 ? "未登录或登录已失效" : "生成请求失败");
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      onProgress(event.index, event.total, event.result);
    }
  }
}

export async function getDefaultPrompts(): Promise<PromptConfig> {
  const resp = await fetch(`${BASE_URL}/api/prompts/defaults`, { headers: authHeaders() });
  return parseJsonResponse<PromptConfig>(resp);
}

export async function getDefaultModelConfig(): Promise<ModelConfig> {
  const resp = await fetch(`${BASE_URL}/api/model/defaults`, { headers: authHeaders() });
  return parseJsonResponse<ModelConfig>(resp);
}

export async function testModelConfig(modelConfig: ModelConfig): Promise<ModelTestResult> {
  const resp = await fetch(`${BASE_URL}/api/model/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(modelConfig),
  });
  return parseJsonResponse<ModelTestResult>(resp);
}

export async function uploadFile(file: File): Promise<CharacterInput[]> {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await parseJsonResponse<{ characters: CharacterInput[] }>(resp);
  return data.characters.map((c: any, i: number) => ({ ...c, key: String(i) }));
}

export async function exportResults(results: CharacterResult[]): Promise<void> {
  const resp = await fetch(`${BASE_URL}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(results),
  });
  if (!resp.ok) {
    throw new Error(resp.status === 401 ? "未登录或登录已失效" : "导出失败");
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "results.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
