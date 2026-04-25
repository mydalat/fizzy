// Task MCP Server for Windmill (Bun runtime)
// JSON-RPC 2.0 — Self-contained: 10 tools for AI agents to manage tasks/todos.
//
// Credentials:
//   - Resource:  f/task/config       (type: task_config)
//   - Variable:  f/task/access_token (secret, scope read+write)
//
// Deploy path: f/task/do

import * as wmill from "windmill-client@1";

// ============================================================
// TYPES
// ============================================================

interface JsonRpcResponse {
  jsonrpc: string;
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Mirrors the Windmill resource type `task_config`.
interface TaskConfig {
  base_url: string;
  account_id: string;
}

// ============================================================
// CONFIG / FETCH / AUTH
// ============================================================

let _cfgCache: TaskConfig | null = null;
let _tokenCache: string | null = null;

async function getConfig(): Promise<TaskConfig> {
  if (!_cfgCache) {
    _cfgCache = (await wmill.getResource("f/task/config")) as TaskConfig;
  }
  return _cfgCache;
}

async function getToken(): Promise<string> {
  if (!_tokenCache) {
    _tokenCache = await wmill.getVariable("f/task/access_token");
  }
  return _tokenCache;
}

async function taskFetch(path: string, init: RequestInit = {}): Promise<any> {
  const cfg = await getConfig();
  const token = await getToken();
  const url = path.startsWith("http")
    ? path
    : `${cfg.base_url}/${cfg.account_id}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    throw new Error("AUTH_EXPIRED: refresh f/task/access_token");
  }
  if (res.status === 429) {
    throw new Error(
      `RATE_LIMIT: retry after ${res.headers.get("Retry-After") ?? "?"}s`
    );
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return null;

  const ct = res.headers.get("Content-Type") ?? "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

// ============================================================
// FORMAT HELPERS
// ============================================================

const clip = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n - 1) + "…" : s;

function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface CompactCard {
  n: number;
  t: string;
  st: string;
  b: string;
  a: string;
  tg: string;
  u: string;
}

function compactCard(c: any): CompactCard {
  const status = c.closed
    ? "closed"
    : c.column?.name ?? c.status ?? "triage";
  return {
    n: c.number,
    t: clip(c.title ?? "", 80),
    st: status,
    b: c.board?.name ?? "",
    a: (c.assignees ?? []).map((u: any) => u.name ?? u.email ?? "").join(","),
    tg: (c.tags ?? [])
      .map((t: any) => (typeof t === "string" ? t : t.title ?? ""))
      .filter(Boolean)
      .join(","),
    u: (c.last_active_at ?? c.updated_at ?? "").slice(0, 10),
  };
}

function formatCardsTable(cards: any[]): string {
  if (!cards.length) return "_no cards_";
  const rows = cards.map(compactCard);
  const head = "n|title|status|board|assignees|tags|updated";
  const sep = "-|-|-|-|-|-|-";
  const body = rows
    .map((r) => `${r.n}|${r.t}|${r.st}|${r.b}|${r.a}|${r.tg}|${r.u}`)
    .join("\n");
  return [head, sep, body].join("\n");
}

function formatList<T>(
  items: T[],
  cols: { key: keyof T | ((x: T) => string); label: string }[]
): string {
  if (!items.length) return "_empty_";
  const head = cols.map((c) => c.label).join("|");
  const sep = cols.map(() => "-").join("|");
  const body = items
    .map((it) =>
      cols
        .map((c) =>
          typeof c.key === "function"
            ? c.key(it)
            : String((it as any)[c.key] ?? "")
        )
        .join("|")
    )
    .join("\n");
  return [head, sep, body].join("\n");
}

// ============================================================
// LOOKUP CACHES + RESOLVERS
// ============================================================

let boardsCache: any[] | null = null;
const columnsCache: Record<string, any[]> = {};
let usersCache: any[] | null = null;
let tagsCache: any[] | null = null;

const isLikelyId = (s: string): boolean =>
  /^[a-z0-9]{20,}$/i.test(s) || /^[0-9a-f-]{30,}$/i.test(s);

async function getAllBoards(): Promise<any[]> {
  if (!boardsCache) boardsCache = (await taskFetch("/boards")) ?? [];
  return boardsCache!;
}

async function getAllUsers(): Promise<any[]> {
  if (!usersCache) usersCache = (await taskFetch("/users")) ?? [];
  return usersCache!;
}

async function getAllTags(): Promise<any[]> {
  if (!tagsCache) tagsCache = (await taskFetch("/tags")) ?? [];
  return tagsCache!;
}

async function getColumns(boardId: string): Promise<any[]> {
  if (!columnsCache[boardId]) {
    columnsCache[boardId] =
      (await taskFetch(`/boards/${boardId}/columns`)) ?? [];
  }
  return columnsCache[boardId];
}

const norm = (s: string) => s.toLowerCase().trim();

async function resolveBoardId(nameOrId: string): Promise<string> {
  if (isLikelyId(nameOrId)) return nameOrId;
  const boards = await getAllBoards();
  const target = norm(nameOrId);
  const exact = boards.find((b: any) => norm(b.name) === target);
  if (exact) return exact.id;
  const partial = boards.find((b: any) => norm(b.name).includes(target));
  if (partial) return partial.id;
  const names = boards.map((b: any) => b.name).join(", ");
  throw new Error(`Board not found: "${nameOrId}". Available: ${names}`);
}

async function resolveColumnId(
  boardId: string,
  nameOrId: string
): Promise<string> {
  if (isLikelyId(nameOrId)) return nameOrId;
  const cols = await getColumns(boardId);
  const target = norm(nameOrId);
  const exact = cols.find((c: any) => norm(c.name) === target);
  if (exact) return exact.id;
  const partial = cols.find((c: any) => norm(c.name).includes(target));
  if (partial) return partial.id;
  const names = cols.map((c: any) => c.name).join(", ");
  throw new Error(`Column not found: "${nameOrId}". Available: ${names}`);
}

async function resolveUserId(emailOrName: string): Promise<string> {
  if (isLikelyId(emailOrName)) return emailOrName;
  const users = await getAllUsers();
  const target = norm(emailOrName);
  const byEmail = users.find((u: any) => norm(u.email ?? "") === target);
  if (byEmail) return byEmail.id;
  const byName = users.find((u: any) => norm(u.name ?? "") === target);
  if (byName) return byName.id;
  const partial = users.find(
    (u: any) =>
      norm(u.name ?? "").includes(target) ||
      norm(u.email ?? "").includes(target)
  );
  if (partial) return partial.id;
  throw new Error(`User not found: "${emailOrName}"`);
}

async function resolveTagId(title: string): Promise<string> {
  if (isLikelyId(title)) return title;
  const tags = await getAllTags();
  const target = norm(title);
  const found = tags.find((t: any) => norm(t.title ?? t.name ?? "") === target);
  if (found) return found.id;
  throw new Error(`Tag not found: "${title}"`);
}

async function resolveStepId(
  cardNumber: number,
  ref: string
): Promise<string> {
  if (isLikelyId(ref)) return ref;
  const card = await taskFetch(`/cards/${cardNumber}`);
  const steps: any[] = card.steps ?? [];
  if (!steps.length) throw new Error(`Card #${cardNumber} has no steps`);
  const idx = parseInt(ref, 10);
  if (!isNaN(idx) && String(idx) === ref.trim() && idx >= 1 && idx <= steps.length) {
    return steps[idx - 1].id;
  }
  const target = norm(ref);
  const exact = steps.find((s: any) => norm(s.content ?? "") === target);
  if (exact) return exact.id;
  const partial = steps.find((s: any) => norm(s.content ?? "").includes(target));
  if (partial) return partial.id;
  throw new Error(`Step not found in #${cardNumber}: "${ref}"`);
}

// ============================================================
// MCP TOOL DEFINITIONS
// ============================================================

const MCP_TOOLS: ToolDefinition[] = [
  {
    name: "task_boards",
    description: "List boards.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "task_columns",
    description: "List columns of a board.",
    inputSchema: {
      type: "object",
      required: ["board"],
      properties: {
        board: { type: "string", description: "Board name or id" },
      },
    },
  },
  {
    name: "task_users",
    description: "List active users.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "task_cards_list",
    description:
      "List cards. Filter by board/column/assignee/tag/state/term.",
    inputSchema: {
      type: "object",
      properties: {
        board: { type: "string" },
        column: { type: "string" },
        assignee: { type: "string", description: "Name or email" },
        tag: { type: "string" },
        state: {
          type: "string",
          enum: ["all", "maybe", "closed", "not_now", "stalled", "golden"],
        },
        term: { type: "string" },
        limit: { type: "integer", default: 20, maximum: 100 },
        sort: {
          type: "string",
          enum: ["latest", "newest"],
          default: "latest",
        },
      },
    },
  },
  {
    name: "task_card_get",
    description: "Get card detail by number.",
    inputSchema: {
      type: "object",
      required: ["number"],
      properties: { number: { type: "integer" } },
    },
  },
  {
    name: "task_card_create",
    description: "Create card on a board.",
    inputSchema: {
      type: "object",
      required: ["board", "title"],
      properties: {
        board: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "task_card_update",
    description: "Update card title/description.",
    inputSchema: {
      type: "object",
      required: ["number"],
      properties: {
        number: { type: "integer" },
        title: { type: "string" },
        description: { type: "string" },
      },
    },
  },
  {
    name: "task_card_move",
    description: "Move card to column. Empty column = back to triage.",
    inputSchema: {
      type: "object",
      required: ["number"],
      properties: {
        number: { type: "integer" },
        column: { type: "string" },
      },
    },
  },
  {
    name: "task_card_close",
    description: "Close or reopen card.",
    inputSchema: {
      type: "object",
      required: ["number"],
      properties: {
        number: { type: "integer" },
        reopen: { type: "boolean", default: false },
      },
    },
  },
  {
    name: "task_card_op",
    description:
      "Misc op: not_now|delete|comment|tag|assign|unassign.",
    inputSchema: {
      type: "object",
      required: ["number", "op"],
      properties: {
        number: { type: "integer" },
        op: {
          type: "string",
          enum: [
            "not_now",
            "delete",
            "comment",
            "tag",
            "assign",
            "unassign",
          ],
        },
        text: { type: "string", description: "Comment body or tag title" },
        user: { type: "string", description: "Name/email for assign/unassign" },
      },
    },
  },
  {
    name: "task_step",
    description:
      "Manage steps (todo items) on card: add|set|delete.",
    inputSchema: {
      type: "object",
      required: ["number", "op"],
      properties: {
        number: { type: "integer" },
        op: { type: "string", enum: ["add", "set", "delete"] },
        step: {
          type: "string",
          description:
            "Step id, 1-based index, or content match (required for set/delete)",
        },
        text: {
          type: "string",
          description: "Content for add or rename",
        },
        done: {
          type: "boolean",
          description: "Completed state",
        },
      },
    },
  },
];

// ============================================================
// TOOL HANDLERS
// ============================================================

async function handleToolCall(
  toolName: string,
  args: Record<string, any>
): Promise<string> {
  switch (toolName) {
    case "task_boards": {
      const boards = await getAllBoards();
      return formatList(boards, [
        { key: "name", label: "name" },
        {
          key: (b: any) => (b.all_access ? "all" : "restricted"),
          label: "access",
        },
        {
          key: (b: any) => String(b.auto_postpone_period_in_days ?? ""),
          label: "auto_postpone_d",
        },
      ]);
    }

    case "task_columns": {
      const boardId = await resolveBoardId(args.board);
      const cols = await getColumns(boardId);
      return formatList(cols, [
        { key: "name", label: "name" },
        { key: (c: any) => c.color ?? "", label: "color" },
      ]);
    }

    case "task_users": {
      const users = await getAllUsers();
      return formatList(users, [
        { key: "name", label: "name" },
        { key: "email", label: "email" },
        { key: (u: any) => u.role ?? "", label: "role" },
      ]);
    }

    case "task_cards_list": {
      const q = new URLSearchParams();

      let boardId: string | null = null;
      if (args.board) {
        boardId = await resolveBoardId(args.board);
        q.append("board_ids[]", boardId);
      }
      if (args.column) {
        if (!boardId) {
          throw new Error("column filter requires board");
        }
        q.append(
          "column_ids[]",
          await resolveColumnId(boardId, args.column)
        );
      }
      if (args.assignee) {
        q.append("assignee_ids[]", await resolveUserId(args.assignee));
      }
      if (args.tag) q.append("tag_ids[]", await resolveTagId(args.tag));
      if (args.state && args.state !== "all") {
        q.set("indexed_by", args.state);
      }
      if (args.term) q.append("terms[]", args.term);
      q.set("sorted_by", args.sort ?? "latest");

      const cards = (await taskFetch(`/cards?${q.toString()}`)) ?? [];
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
      const limited = cards.slice(0, limit);
      return formatCardsTable(limited);
    }

    case "task_card_get": {
      const c = await taskFetch(`/cards/${args.number}`);
      const lines: string[] = [];
      lines.push(`#${c.number}: ${c.title}`);
      lines.push(
        `status: ${c.closed ? "closed" : c.column?.name ?? "triage"}`
      );
      lines.push(`board: ${c.board?.name ?? ""}`);
      const assignees = (c.assignees ?? [])
        .map((u: any) => u.name)
        .join(", ");
      if (assignees) lines.push(`assignees: ${assignees}`);
      const tags = (c.tags ?? [])
        .map((t: any) => (typeof t === "string" ? t : t.title))
        .filter(Boolean)
        .join(", ");
      if (tags) lines.push(`tags: ${tags}`);
      if (c.creator?.name) lines.push(`creator: ${c.creator.name}`);
      if (c.last_active_at)
        lines.push(`updated: ${c.last_active_at.slice(0, 10)}`);
      const desc = htmlToText(c.description_html ?? c.description ?? "");
      if (desc) {
        lines.push("");
        lines.push(desc);
      }
      const steps = c.steps ?? [];
      if (steps.length) {
        lines.push("");
        lines.push("steps:");
        steps.forEach((s: any, i: number) => {
          lines.push(`${i + 1}. [${s.completed ? "x" : " "}] ${s.content}`);
        });
      }
      return lines.join("\n");
    }

    case "task_card_create": {
      const boardId = await resolveBoardId(args.board);
      const tag_ids = args.tags
        ? await Promise.all(args.tags.map(resolveTagId))
        : undefined;
      const created = await taskFetch(`/boards/${boardId}/cards`, {
        method: "POST",
        body: JSON.stringify({
          card: {
            title: args.title,
            description: args.description,
            tag_ids,
          },
        }),
      });
      const num = created?.number ?? "?";
      return `ok: created #${num}`;
    }

    case "task_card_update": {
      const card: Record<string, unknown> = {};
      if (args.title !== undefined) card.title = args.title;
      if (args.description !== undefined) card.description = args.description;
      if (Object.keys(card).length === 0) {
        return "noop: nothing to update";
      }
      await taskFetch(`/cards/${args.number}`, {
        method: "PUT",
        body: JSON.stringify({ card }),
      });
      return `ok: updated #${args.number}`;
    }

    case "task_card_move": {
      if (!args.column) {
        await taskFetch(`/cards/${args.number}/triage`, {
          method: "DELETE",
        });
        return `ok: #${args.number} → triage`;
      }
      const card = await taskFetch(`/cards/${args.number}`);
      const colId = await resolveColumnId(card.board.id, args.column);
      await taskFetch(`/cards/${args.number}/triage`, {
        method: "POST",
        body: new URLSearchParams({ column_id: colId }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return `ok: moved #${args.number} → ${args.column}`;
    }

    case "task_card_close": {
      await taskFetch(`/cards/${args.number}/closure`, {
        method: args.reopen ? "DELETE" : "POST",
      });
      return args.reopen
        ? `ok: reopened #${args.number}`
        : `ok: closed #${args.number}`;
    }

    case "task_card_op": {
      const n = args.number;
      switch (args.op) {
        case "not_now":
          await taskFetch(`/cards/${n}/not_now`, { method: "POST" });
          break;
        case "delete":
          await taskFetch(`/cards/${n}`, { method: "DELETE" });
          break;
        case "comment":
          if (!args.text) throw new Error("comment requires text");
          await taskFetch(`/cards/${n}/comments`, {
            method: "POST",
            body: JSON.stringify({ comment: { body: args.text } }),
          });
          break;
        case "tag":
          if (!args.text) throw new Error("tag requires text (tag title)");
          await taskFetch(`/cards/${n}/taggings`, {
            method: "POST",
            body: new URLSearchParams({ tag_title: args.text }),
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });
          break;
        case "assign":
          if (!args.user) throw new Error("assign requires user");
          await taskFetch(`/cards/${n}/assignments`, {
            method: "POST",
            body: new URLSearchParams({
              assignee_id: await resolveUserId(args.user),
            }),
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });
          break;
        case "unassign": {
          if (!args.user) throw new Error("unassign requires user");
          const uid = await resolveUserId(args.user);
          await taskFetch(`/cards/${n}/assignments/${uid}`, {
            method: "DELETE",
          });
          break;
        }
        default:
          throw new Error(`Unknown op: ${args.op}`);
      }
      return `ok: ${args.op} #${n}`;
    }

    case "task_step": {
      const n = args.number;
      switch (args.op) {
        case "add": {
          if (!args.text) throw new Error("add requires text");
          const step: Record<string, unknown> = { content: args.text };
          if (args.done !== undefined) step.completed = args.done;
          await taskFetch(`/cards/${n}/steps`, {
            method: "POST",
            body: JSON.stringify({ step }),
          });
          return `ok: step added on #${n}`;
        }
        case "set": {
          if (!args.step) throw new Error("set requires step");
          const stepId = await resolveStepId(n, args.step);
          const step: Record<string, unknown> = {};
          if (args.text !== undefined) step.content = args.text;
          if (args.done !== undefined) step.completed = args.done;
          if (Object.keys(step).length === 0) {
            return "noop: nothing to set (provide text or done)";
          }
          await taskFetch(`/cards/${n}/steps/${stepId}`, {
            method: "PUT",
            body: JSON.stringify({ step }),
          });
          return `ok: step updated on #${n}`;
        }
        case "delete": {
          if (!args.step) throw new Error("delete requires step");
          const stepId = await resolveStepId(n, args.step);
          await taskFetch(`/cards/${n}/steps/${stepId}`, {
            method: "DELETE",
          });
          return `ok: step deleted on #${n}`;
        }
        default:
          throw new Error(`Unknown step op: ${args.op}`);
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ============================================================
// JSON-RPC 2.0 MAIN
// ============================================================

export async function main(
  jsonrpc?: string,
  id?: string | number | null,
  method?: string,
  params?: Record<string, any>
): Promise<JsonRpcResponse> {
  const rpcId = id ?? null;

  try {
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id: rpcId,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: { name: "task-mcp", version: "1.0.0" },
            capabilities: { tools: { listChanged: false } },
          },
        };

      case "notifications/initialized":
        return { jsonrpc: "2.0", id: rpcId, result: {} };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id: rpcId,
          result: { tools: MCP_TOOLS },
        };

      case "tools/call": {
        const toolName = params?.name;
        const toolArgs = params?.arguments ?? {};

        if (!toolName) {
          return {
            jsonrpc: "2.0",
            id: rpcId,
            error: { code: -32602, message: "Missing tool name" },
          };
        }
        if (!MCP_TOOLS.some((t) => t.name === toolName)) {
          return {
            jsonrpc: "2.0",
            id: rpcId,
            error: { code: -32602, message: `Unknown tool: ${toolName}` },
          };
        }

        try {
          const text = await handleToolCall(toolName, toolArgs);
          return {
            jsonrpc: "2.0",
            id: rpcId,
            result: { content: [{ type: "text", text }] },
          };
        } catch (err: any) {
          return {
            jsonrpc: "2.0",
            id: rpcId,
            result: {
              content: [{ type: "text", text: `Error: ${err.message}` }],
              isError: true,
            },
          };
        }
      }

      default:
        return {
          jsonrpc: "2.0",
          id: rpcId,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (err: any) {
    return {
      jsonrpc: "2.0",
      id: rpcId,
      error: { code: -32603, message: err.message },
    };
  }
}
