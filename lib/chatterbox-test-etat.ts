type Voice = "male" | "female";
type Counts = {
  completed: number;
  error: number;
  last_generation_ms: number | null;
  last_completed_at: string | null;
  last_error_at: string | null;
};
type State = { started_at: string; male: Counts; female: Counts };
const empty = (): Counts => ({ completed: 0, error: 0, last_generation_ms: null, last_completed_at: null, last_error_at: null });
// Share the same counters even when Next bundles the two routes separately.
// They contain no text, audio, credential, URL or user identifier.
const memory = globalThis as typeof globalThis & { __khalamChatterboxTestEtat?: State };
const state = memory.__khalamChatterboxTestEtat ??= {
  started_at: new Date().toISOString(), male: empty(), female: empty(),
};

export function noterChatterboxTest(voice: Voice, result: { ok: true; generationMs: number } | { ok: false }) {
  const counts = state[voice];
  if (result.ok) {
    counts.completed++;
    counts.last_generation_ms = Number.isFinite(result.generationMs) && result.generationMs >= 0 ? result.generationMs : null;
    counts.last_completed_at = new Date().toISOString();
  } else {
    counts.error++;
    counts.last_error_at = new Date().toISOString();
  }
}

export function resumeChatterboxTest() {
  return {
    scope: "upstream_generations_since_process_start",
    started_at: state.started_at,
    male: { ...state.male }, female: { ...state.female },
  };
}
