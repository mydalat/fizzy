# Windmill scripts

Scripts deployed lên Windmill (Bun runtime). Giữ source-of-truth ở repo này, paste vào Windmill UI khi cập nhật.

Cấu trúc folder mirror đúng đường dẫn Windmill (`f/<folder>/<name>`):

```
windmill/
└── f/
    └── task/
        └── do.ts      # MCP server cho AI agent quản lý task/todo
```

---

## `f/task/do` — Task MCP Server

Single-file MCP (Model Context Protocol) server JSON-RPC 2.0. Cho phép AI agent thao tác CRUD task qua API nội bộ (`do.chip.vn`).

### Windmill paths

| Loại | Path | Vai trò |
|---|---|---|
| Script | `f/task/do` | Bun script, entry `main()` |
| Resource Type | `task_config` | Schema cho config resource |
| Resource | `f/task/config` | `{ base_url, account_id }` |
| Variable | `f/task/access_token` | Personal token (secret) |

### Tools (11)

| Tool | Mô tả |
|---|---|
| `task_boards` | List boards |
| `task_columns` | List columns of a board |
| `task_users` | List active users |
| `task_cards_list` | List/filter cards (markdown table) |
| `task_card_get` | Card detail by number (kèm steps đánh số 1-based) |
| `task_card_create` | Create card on a board |
| `task_card_update` | Update title/description |
| `task_card_move` | Move card to column (empty = back to triage) |
| `task_card_close` | Close / reopen |
| `task_card_op` | Misc: not_now/delete/comment/tag/assign/unassign |
| `task_step` | Manage steps (todo): add / set (rename + check) / delete |

#### `task_step` — chi tiết

`step` arg chấp nhận: step UUID, 1-based index từ `task_card_get`, hoặc fuzzy match theo content.

```jsonc
// add 1 step mới
{ "op": "add",    "number": 42, "text": "Write tests" }

// đánh dấu HOÀN THÀNH step số 2
{ "op": "set",    "number": 42, "step": "2", "done": true }

// bỏ đánh dấu (chưa hoàn thành) step số 2
{ "op": "set",    "number": 42, "step": "2", "done": false }

// đổi nội dung step có chữ "Write tests"
{ "op": "set",    "number": 42, "step": "Write tests", "text": "Write integration tests" }

// XÓA step
{ "op": "delete", "number": 42, "step": "3" }
```

---

## Setup (one-time)

### 1. Lấy access token + account_id

```bash
# Đăng nhập do.chip.vn → Settings → Developer → New access token
# Scope: read + write. Copy token.

curl -H "Authorization: Bearer <TOKEN>" https://do.chip.vn/my/identity
# → ghi nhận accounts[0].slug (vd: "1234567")
```

### 2. Tạo Resource Type `task_config`

Resource Type là schema (cấu trúc) — phải tạo trước khi tạo resource cùng kiểu.

**UI:** Workspace → **Resources** → tab **Resource Types** → **+ New resource type**

| Field | Value |
|---|---|
| Name | `task_config` |
| Description | `Config for f/task/do MCP server` |
| Schema | (paste JSON schema bên dưới) |

JSON Schema:

```json
{
  "type": "object",
  "required": ["base_url", "account_id"],
  "properties": {
    "base_url":   { "type": "string", "description": "Base URL, no trailing slash" },
    "account_id": { "type": "string", "description": "Tenant slug (digits)" }
  }
}
```

**Hoặc qua CLI** (`wmill`):

```bash
wmill resource-type push task_config --schema '{
  "type": "object",
  "required": ["base_url", "account_id"],
  "properties": {
    "base_url":   { "type": "string" },
    "account_id": { "type": "string" }
  }
}'
```

### 3. Tạo Resource `f/task/config`

**UI:** Workspace → **Resources** → **+ New resource**

| Field | Value |
|---|---|
| Path | `f/task/config` |
| Resource type | `task_config` (chọn từ dropdown — chính là cái vừa tạo) |
| Value | `{ "base_url": "https://do.chip.vn", "account_id": "<slug từ bước 1>" }` |

> Lưu ý: chọn đúng `task_config` ở dropdown để form hiện 2 input field theo schema thay vì JSON editor thô.

### 4. Tạo Variable `f/task/access_token` (secret)

**UI:** Workspace → **Variables** → **+ New variable**

| Field | Value |
|---|---|
| Path | `f/task/access_token` |
| Secret | ✅ **Bật** (quan trọng — token sẽ được mã hóa) |
| Value | `<TOKEN từ bước 1>` |

### 5. Tạo Script `f/task/do`

**UI:** Workspace → **Scripts** → **+ New script**

| Field | Value |
|---|---|
| Path | `f/task/do` |
| Language | **Bun** (TypeScript) |
| Content | (paste toàn bộ nội dung `windmill/f/task/do.ts`) |

Click **Deploy**.

### 6. Đăng ký MCP server trong agent client

Lấy webhook URL của script (Settings → Webhook → "Run with permanented token") rồi thêm vào agent client (Claude Desktop, cline, OpenAI custom GPT, …):

```json
{
  "mcpServers": {
    "task": {
      "type": "http",
      "url": "https://<windmill-host>/api/w/<workspace>/jobs/run_wait_result/p/f/task/do?token=<runner-token>"
    }
  }
}
```

---

## Smoke test (curl JSON-RPC)

Thay `<URL>` bằng webhook URL của script.

```bash
# 1. initialize
curl -X POST <URL> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'

# 2. tools/list (kỳ vọng 10 tools)
curl -X POST <URL> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 3. list boards
curl -X POST <URL> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call",
       "params":{"name":"task_boards","arguments":{}}}'

# 4. list cards (5 dòng đầu trong board)
curl -X POST <URL> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call",
       "params":{"name":"task_cards_list",
                 "arguments":{"board":"<board-name>","limit":5}}}'

# 5. tạo card test
curl -X POST <URL> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call",
       "params":{"name":"task_card_create",
                 "arguments":{"board":"<board-name>","title":"smoke"}}}'
```

---

## Token optimization (đã apply trong script)

- List endpoints trả markdown table compact (`n|title|status|board|assignees|tags|updated`).
- Mutations trả ack 1 dòng: `ok: created #42`, `ok: moved #42 → Doing`.
- Lookup cache in-memory per job: boards/columns/users/tags fetch lazy lần đầu hit.
- Resolver fuzzy: agent dùng tên (`"Doing"`, `"Eng team"`) thay vì UUID.
- Single account_id qua resource — agent không cần truyền mỗi call.
- Description schema gọn (mỗi tool ≤30 token).

Mục tiêu: `tools/list` < 1.5 KB, `task_cards_list limit=20` < 2 KB output.
