import { spawn } from "node:child_process";

/**
 * The writer, driven through the Claude Code CLI in print mode.
 *
 * There is no API key on this machine and there does not need to be: the CLI
 * is already authenticated against the user's subscription, and `claude -p`
 * is a batch interface to it. Each call is a fresh session with no history,
 * which is what makes a thousand of them independent and resumable.
 *
 * Almost everything here is about making that call cheap, because the default
 * one is not. A bare `claude -p` on this machine carries 44,000 tokens of
 * cached prompt before a word of the actual request — the MCP servers
 * configured for interactive work (Figma, Slack, Sanity, PostHog, Zapier,
 * Playwright) each contribute their tool definitions, and the writer needs
 * none of them. Stripping the harness down to nothing took that to 6,000, a
 * tenfold reduction, and over a thousand pages that is the difference between
 * a batch worth running and one that is not:
 *
 *   --strict-mcp-config --mcp-config {}   no MCP servers, no tool definitions
 *   --setting-sources                     no project CLAUDE.md, no skills
 *   --disallowed-tools                    no file or shell tools to describe
 *   --max-turns 1                         one response, no agentic loop
 *
 * The remaining overhead is amortised by batching: several page briefs go in
 * one call, so the fixed cost is paid once per batch rather than once per
 * page. Batches are kept small anyway — a large one invites a truncated JSON
 * response, and a truncated batch loses every page in it rather than one.
 */

export type ClaudeResult = {
  text: string;
  costUsd: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export type ClaudeOptions = {
  model?: string;
  /** Milliseconds before the child is killed. A hung call must not hold a slot. */
  timeoutMs?: number;
  systemPrompt?: string;
};

const BASE_ARGS = [
  "-p",
  "--output-format",
  "json",
  "--max-turns",
  "1",
  /* No MCP servers. This is the single biggest saving and the reason an empty
     config object is passed rather than the flag being omitted — omitting it
     inherits the interactive configuration. */
  "--strict-mcp-config",
  "--mcp-config",
  '{"mcpServers":{}}',
  /*
   * User settings only — no project settings.
   *
   * That keeps this repository's CLAUDE.md and AGENTS.md out of a prompt that
   * has nothing to do with either. It is `user` rather than an empty value
   * because the flag validates against a fixed list and has no "none": passing
   * "" made the CLI read the *next* argument as the source name and fail with
   * `Invalid setting source: --disallowed-tools`, which is a confusing error
   * for a quoting mistake. Authentication comes from user settings anyway, so
   * dropping them entirely is not an option.
   */
  "--setting-sources",
  "user",
  /* The writer returns prose. It has no business touching this repository, and
     a tool it cannot use is a tool whose definition need not be sent. */
  "--disallowed-tools",
  "Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch,Task,TodoWrite,NotebookEdit,SlashCommand,Skill,BashOutput,KillShell",
];

export async function callClaude(
  prompt: string,
  opts: ClaudeOptions = {},
): Promise<ClaudeResult> {
  const args = [...BASE_ARGS, "--model", opts.model ?? "sonnet"];
  if (opts.systemPrompt) args.push("--append-system-prompt", opts.systemPrompt);

  const started = Date.now();
  const raw = await runWithRetry("claude", args, prompt, opts.timeoutMs ?? 300_000);

  let parsed: {
    result?: string;
    is_error?: boolean;
    subtype?: string;
    total_cost_usd?: number;
    usage?: { input_tokens?: number; output_tokens?: number };
    modelUsage?: Record<string, unknown>;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `The CLI did not return JSON. First 300 characters: ${raw.slice(0, 300)}`,
    );
  }

  if (parsed.is_error || typeof parsed.result !== "string") {
    throw new Error(`CLI reported an error (${parsed.subtype ?? "unknown"})`);
  }

  return {
    text: parsed.result,
    costUsd: parsed.total_cost_usd ?? 0,
    durationMs: Date.now() - started,
    inputTokens: parsed.usage?.input_tokens ?? 0,
    outputTokens: parsed.usage?.output_tokens ?? 0,
    model: Object.keys(parsed.modelUsage ?? {})[0] ?? (opts.model ?? "sonnet"),
  };
}

/** Does stdout hold a finished CLI response, whatever the exit code said? */
function looksLikeResult(out: string): boolean {
  const text = out.trim();
  if (!text.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(text) as { result?: unknown; is_error?: boolean };
    return typeof parsed.result === "string" && parsed.is_error !== true;
  } catch {
    return false;
  }
}

/**
 * Windows cannot always start the process, and that is survivable.
 *
 * Exit code 3221225794 is 0xC0000142, STATUS_DLL_INIT_FAILED. It is not a
 * failure of the CLI or of the prompt — it is Windows refusing to initialise a
 * new process because the desktop heap is exhausted, which is what happens when
 * several heavyweight children are spawned at once and held open for minutes at
 * a time. The tell is that it arrives with an empty stderr and takes out every
 * batch in flight at once.
 *
 * The first run of this stage lost 850 pages to it: 111 written, then every
 * remaining batch failing identically, with nothing in the log to suggest the
 * cause was the launcher rather than the work.
 *
 * So it is retried with a widening gap, and the gap is the fix — the condition
 * clears on its own once the processes already running exit. Genuine errors
 * (a bad prompt, an authentication problem, a timeout) are not retried, because
 * repeating them just costs four times as much to fail.
 */
const PROCESS_START_FAILURES = new Set([3221225794, 3221225477, 3221226505]);

async function runWithRetry(
  cmd: string,
  args: string[],
  stdin: string,
  timeoutMs: number,
  attempts = 4,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run(cmd, args, stdin, timeoutMs);
    } catch (err) {
      lastError = err;
      const message = (err as Error).message;
      const code = Number(message.match(/CLI exited (-?\d+)/)?.[1]);
      const transient =
        PROCESS_START_FAILURES.has(code) ||
        /Could not start the CLI/.test(message);

      if (!transient || attempt === attempts) throw err;

      /* 2s, 6s, 14s — long enough for in-flight children to exit and give the
         desktop heap back, short enough not to stall a thousand-page run. */
      const wait = 2000 * (2 ** attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  throw lastError;
}

/**
 * The prompt goes in on stdin rather than as an argument.
 *
 * A page brief with an outline and half a dozen queries runs to a couple of
 * thousand characters, and Windows caps a command line at 32,767. Passing it
 * as an argument works in testing with a short brief and fails in the batch
 * with a long one — the worst possible place to discover the limit.
 */
function run(
  cmd: string,
  args: string[],
  stdin: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    /*
     * No shell.
     *
     * One argument is a JSON object — `{"mcpServers":{}}` — and with
     * `shell: true` Node concatenates arguments into a command string rather
     * than escaping them, so the braces and quotes are re-interpreted by cmd
     * before the CLI ever sees them. On this machine `claude` is a real .exe
     * rather than a .cmd shim, so it can be spawned directly and the argument
     * vector is passed through intact.
     */
    const child = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let out = "";
    let err = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));

    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Could not start the CLI: ${e.message}`));
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        /*
         * A non-zero exit does not always mean no answer.
         *
         * The CLI runs session hooks on teardown, and a hook that fails takes
         * the exit code with it even though the work finished and the result is
         * sitting in stdout. On this machine a PostHog plugin hook shells out
         * to `python3`, which is not on PATH, so every call exited 1 with a
         * complete, valid response already printed — losing a whole batch to a
         * teardown error in an unrelated plugin.
         *
         * So: if stdout parses as the CLI's result envelope, take it. If it
         * does not, the exit code is the real story and the error stands.
         */
        if (looksLikeResult(out)) {
          resolve(out);
          return;
        }
        const tail = out.trim() ? ` · stdout: ${out.trim().slice(0, 400)}` : "";
        reject(new Error(`CLI exited ${code}: ${err.trim().slice(0, 300)}${tail}`));
        return;
      }
      resolve(out);
    });

    child.stdin.write(stdin);
    child.stdin.end();
  });
}

/**
 * Pull a JSON value out of a model response.
 *
 * Asking for bare JSON gets bare JSON most of the time. The rest of the time
 * it arrives inside a fenced block, or with a sentence of preamble, and a
 * batch that throws away one page in twenty for punctuation is a batch that
 * costs five per cent more than it should for no reason. Three attempts, in
 * descending order of how much the response is being trusted.
 */
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    /* fall through */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      /* fall through */
    }
  }

  /* Outermost brace or bracket to its match. Scanning rather than a greedy
     regex, because a page body containing a brace in prose breaks the regex
     and not the scan. */
  const start = trimmed.search(/[[{]/);
  if (start !== -1) {
    const open = trimmed[start];
    const close = open === "[" ? "]" : "}";
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(trimmed.slice(start, i + 1)) as T;
          } catch {
            break;
          }
        }
      }
    }
  }

  throw new Error(`No JSON in the response. First 200 characters: ${trimmed.slice(0, 200)}`);
}

/**
 * Recover the complete objects from a truncated JSON array.
 *
 * A batched response that runs past the output limit stops mid-object, and
 * every parser rejects the whole thing — so a batch of four pages that was
 * three-and-a-half pages complete yields nothing, and all four are re-queued
 * and paid for twice. That is the single most expensive failure mode in a run
 * this size, and it happened on the first hour.
 *
 * This walks the array and keeps whatever parsed cleanly before the cut. The
 * half-written object at the end is discarded, its page stays `failed`, and a
 * later run picks up that one rather than all four.
 *
 * Deliberately only used as a fallback, after `extractJson` has failed. A
 * response that parses is never put through this, because a salvage pass that
 * runs on healthy output is a silent way to drop a page the model did return.
 */
export function salvageArray<T>(text: string): T[] {
  const start = text.indexOf("[");
  if (start === -1) return [];

  const out: T[] = [];
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) objectStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        try {
          out.push(JSON.parse(text.slice(objectStart, i + 1)) as T);
        } catch {
          /* An object that will not parse on its own is not recoverable from
             here; drop it and keep going rather than losing the ones after. */
        }
        objectStart = -1;
      }
    }
  }

  return out;
}

/**
 * Run tasks with a fixed number in flight.
 *
 * Not `Promise.all` over the whole queue: a thousand concurrent CLI processes
 * is a thousand Node runtimes, and the machine stops. Not a library either —
 * this is the whole of what a pool needs to be when the tasks are independent
 * and the results are already being written to disk one at a time.
 */
export async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async (_, slot) => {
    /* Stagger the start. Every runner beginning in the same tick means every
       child process is created in the same tick, which is precisely the burst
       that exhausts the Windows desktop heap and returns STATUS_DLL_INIT_FAILED
       for all of them. Half a second apart costs nothing over a long run. */
    await new Promise((r) => setTimeout(r, slot * 500));

    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });

  await Promise.all(runners);
  return results;
}
