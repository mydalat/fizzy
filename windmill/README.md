# Windmill scripts

Scripts deployed to Windmill (Bun runtime). Source-of-truth here, paste into Windmill UI when changed.

## `dochipvn_mcp.ts` — MCP server cho AI agent

Single-file MCP (Model Context Protocol) server. JSON-RPC 2.0. Cho phép AI agent thao tác task/todo qua API nội bộ (`do.chip.vn`).

### Setup (one-time)

1. Trên `https://do.chip.vn` → tài khoản → tạo personal access token, scope `read write`. Copy token.
2. `curl -H "Authorization: Bearer <token>" https://do.chip.vn/my/identity` → ghi nhận `accounts[0].slug`.
3. Trong Windmill workspace `chipvn`:
   - Resource `f/dochipvn/config` (type: object):
     ```json
     { "base_url": "https://do.chip.vn", "account_id": "<slug>" }
     ```
   - Variable secret `f/dochipvn/access_token` = `<token>`.
4. Tạo script `f/reporting/dochipvn_mcp` (Bun runtime), paste nội dung `dochipvn_mcp.ts`. Deploy.
5. Đăng ký MCP server trong agent client trỏ vào webhook URL của script.

### Tools (10)

| Tool | Mô tả |
|---|---|
| `dochip_boards` | List boards |
| `dochip_columns` | List columns of a board |
| `dochip_users` | List active users |
| `dochip_cards_list` | List/filter cards (markdown table) |
| `dochip_card_get` | Card detail by number |
| `dochip_card_create` | Create card on a board |
| `dochip_card_update` | Update title/description |
| `dochip_card_move` | Move card to column (or back to triage) |
| `dochip_card_close` | Close / reopen |
| `dochip_card_op` | Misc: not_now/delete/comment/tag/assign/unassign |

### Token optimization

- List endpoints trả markdown table compact (`n|title|status|board|assignees|tags|updated`).
- Mutations trả ack 1 dòng: `ok: created #42`, `ok: moved #42 → Doing`.
- Lookup cache in-memory per job: boards/columns/users/tags fetch lazy, không invalidate.
- Resolver fuzzy: agent dùng tên ("Doing", "Eng team") thay vì UUID.
- Single account_id qua resource — agent không cần truyền mỗi call.

### Smoke test (curl JSON-RPC)

Thay `<URL>` bằng webhook URL của script Windmill.

```bash
# 1. initialize
curl -X POST <URL> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'

# 2. tools/list
curl -X POST <URL> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 3. list boards
curl -X POST <URL> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call",
       "params":{"name":"dochip_boards","arguments":{}}}'

# 4. list cards
curl -X POST <URL> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call",
       "params":{"name":"dochip_cards_list",
                 "arguments":{"board":"<board>","limit":5}}}'
```
