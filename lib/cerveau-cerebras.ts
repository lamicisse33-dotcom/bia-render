import { fetchModeleAvecReprise } from "./reprise-modele";

// Convert the existing compact conversation request to Cerebras' API contract.
export function corpsCerebras(source: Record<string, unknown>) {
  const { include_reasoning, service_tier, tools, ...body } = source;
  return { ...body, model: String(body.model || "gpt-oss-120b").replace(/^openai\//, ""), reasoning_format: "hidden" };
}
export async function appelerCerebras(_url: string, init: RequestInit, limite: number, _secours = false) {
  return fetchModeleAvecReprise("https://api.cerebras.ai/v1/chat/completions", {
    ...init, body: JSON.stringify(corpsCerebras(JSON.parse(String(init.body || "{}")))),
  }, limite);
}
