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

const BASE_URL = "";

export async function generateCharacters(
  characters: CharacterInput[],
  onProgress: (index: number, total: number, result: CharacterResult) => void
): Promise<void> {
  const payload = characters.map(({ name, gender, age, role_type, personality, occupation, scenario, language }) => ({
    name, gender, age, role_type, personality, occupation, scenario, language,
  }));

  const resp = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characters: payload }),
  });

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

export async function uploadFile(file: File): Promise<CharacterInput[]> {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await fetch(`${BASE_URL}/api/upload`, { method: "POST", body: formData });
  const data = await resp.json();
  return data.characters.map((c: any, i: number) => ({ ...c, key: String(i) }));
}

export async function exportResults(results: CharacterResult[]): Promise<void> {
  const resp = await fetch(`${BASE_URL}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(results),
  });
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "results.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
