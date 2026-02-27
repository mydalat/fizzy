@../AGENTS.md

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

# CHIPVN Customizations

This fork of Fizzy includes Vietnamese localization and CHIPVN branding. When merging upstream changes, these customizations must be preserved.

## Production Environment

- **URL**: `https://do.chip.vn`
- **Environment Variable**: `BASE_URL=https://do.chip.vn`
- **Support Email**: `happytohelp@chip.vn`

## Key Customizations

### 1. Vietnamese i18n (Internationalization)

All user-facing text uses Rails i18n with `t()` helper instead of hardcoded English strings.

**Translation file**: `config/locales/vi.yml`

**Common patterns in views**:
```erb
<%# Upstream (English hardcoded) %>
<span>Create board</span>

<%# CHIPVN (Vietnamese i18n) %>
<span><%= t("boards.new.submit") %></span>
```

### 2. CHIPVN Branding

**Logo location**: `app/assets/images/logo.png`

**Public layout** (`app/views/layouts/public.html.erb`):
- Uses CHIPVN SVG logo instead of Fizzy logo
- Links to `root_path` instead of `fizzy.do`

**Colophon partial** (`app/views/layouts/shared/_colophon.html.erb`):
- Uses i18n for branding text

### 3. Email Configuration

**Session footer** (`app/views/sessions/_footer.html.erb`):
- Support email: `happytohelp@chip.vn`

## Upstream Sync Workflow

### Check for updates
```bash
git fetch upstream main
git log --oneline HEAD..upstream/main
```

### Merge upstream
```bash
git merge upstream/main --no-edit
```

### If conflicts occur
1. Read each conflicted file
2. Keep Vietnamese i18n (`t()` helpers)
3. Add new upstream features (CSS classes, data attributes, etc.)
4. Commit with descriptive message

## Common Merge Conflict Patterns

### Pattern 1: i18n vs Hardcoded Text

**Conflict looks like**:
```erb
<<<<<<< HEAD
<span><%= t("cards.delete.button") %></span>
=======
<span>Delete card</span>
>>>>>>> upstream/main
```

**Resolution**: Keep `t()` helper
```erb
<span><%= t("cards.delete.button") %></span>
```

### Pattern 2: New CSS Classes + i18n

**Conflict looks like**:
```erb
<<<<<<< HEAD
<button class="btn" data-action="...">
  <%= t("boards.new.submit") %>
=======
<button class="btn btn--circle-mobile" data-bridge--form-target="submit">
  <span>Create board</span>
>>>>>>> upstream/main
```

**Resolution**: Keep i18n, add new classes/data attributes
```erb
<button class="btn btn--circle-mobile" data-bridge--form-target="submit">
  <%= t("boards.new.submit") %>
```

### Pattern 3: New Helper Methods + i18n

**Conflict looks like**:
```erb
<<<<<<< HEAD
<strong class="popup__title"><%= t("filters.assigned_to") %></strong>
=======
<%= filter_title "Assigned to…" %>
>>>>>>> upstream/main
```

**Resolution**: Use new helper with i18n
```erb
<%= filter_title t("filters.assigned_to") %>
```

### Pattern 4: CSS Variable Changes

**Conflict looks like**:
```erb
<<<<<<< HEAD
<dialog style="max-width: 40ch">
  <h3><%= t("cards.delete.confirm_title") %></h3>
=======
<dialog style="--panel-size: 40ch">
  <h3>Delete this card?</h3>
>>>>>>> upstream/main
```

**Resolution**: Use new CSS variable, keep i18n
```erb
<dialog style="--panel-size: 40ch">
  <h3><%= t("cards.delete.confirm_title") %></h3>
```

### Pattern 5: Polymorphic Refactoring

When upstream changes `@comment` to `@reactable` (or similar polymorphic changes):
- Use the new variable name (`@reactable`)
- Keep i18n translations
- Use polymorphic path helpers

### Pattern 6: Settings Section Wrapper

Upstream refactored settings pages to use `<section class="settings__section">` wrapper.

**Conflict looks like**:
```erb
<<<<<<< HEAD
<header>
  <h2 class="divider txt-large"><%= t("account.entropy.title") %></h2>
  <p class="margin-none-block-start"><%= t("account.entropy.description") %></p>
</header>
=======
<section class="settings__section">
  <header>
    <h2 class="divider">Auto close</h2>
    <div>Fizzy doesn't let stale cards...</div>
  </header>
>>>>>>> upstream/main
```

**Resolution**: Use new `settings__section` wrapper, keep i18n
```erb
<section class="settings__section">
  <header>
    <h2 class="divider"><%= t("account.entropy.title") %></h2>
    <div><%= t("account.entropy.description") %></div>
  </header>
```

### Pattern 7: Feature Relocation

When upstream moves a feature to a different page:
- Follow upstream's new location
- Add i18n key to the new location
- Remove from old location (no conflict, just follow upstream)

**Example**: Import link moved from `sessions/menus/show` to `signups/completions/new`

### Pattern 8: CSS Class Rename

Upstream renamed `rich-text-content` to `lexxy-content` (Lexxy editor upgrade).

**Conflict looks like**:
```erb
<<<<<<< HEAD
<%= form.rich_textarea :description, class: "card__description rich-text-content",
      placeholder: t("cards.edit.description_placeholder"),
=======
<%= form.rich_textarea :description, class: "card__description lexxy-content",
      placeholder: "Add some notes...",
>>>>>>> upstream/main
```

**Resolution**: Use new class name, keep i18n
```erb
<%= form.rich_textarea :description, class: "card__description lexxy-content",
      placeholder: t("cards.edit.description_placeholder"),
```

## Files That Commonly Have Conflicts

| File | Reason |
|------|--------|
| `app/views/boards/new.html.erb` | Form buttons, page title |
| `app/views/cards/_delete.html.erb` | Delete confirmation dialog |
| `app/views/cards/edit.html.erb` | Cancel link, placeholders |
| `app/views/cards/pins/_pin_button.html.erb` | Pin/unpin buttons |
| `app/views/notifications/index.html.erb` | Settings link |
| `app/views/notifications/settings/show.html.erb` | Boards section header |
| `app/views/filters/settings/_assignees.html.erb` | Filter dialog title |
| `app/views/layouts/application.html.erb` | Skip to content link |
| `app/views/layouts/public.html.erb` | CHIPVN branding |
| `app/views/sessions/_footer.html.erb` | Support email |
| `app/views/sessions/menus/show.html.erb` | Account menu text |
| `app/views/signups/completions/new.html.erb` | Import link (moved here) |
| `app/views/reactions/new.html.erb` | Reaction form labels |
| `app/views/account/settings/_entropy.html.erb` | Auto close settings |
| `app/views/account/settings/_export.html.erb` | Export dialog |
| `app/views/account/settings/_name.html.erb` | Account name form |
| `app/views/account/settings/_users.html.erb` | People list |
| `app/views/account/exports/show.html.erb` | Export download page |
| `app/views/users/_theme.html.erb` | Theme switcher |
| `app/views/users/_access_tokens.html.erb` | Developer section |
| `app/views/account/join_codes/show.html.erb` | QR dialog styles |
| `app/views/boards/edit/_publication.html.erb` | Rich textarea class |

## Bridge/Mobile Data Attributes

Upstream adds Hotwire Native bridge attributes. Always preserve these when merging:

- `data-bridge--form-target="submit"` - Form submit buttons
- `data-bridge--form-target="cancel"` - Cancel links
- `data-bridge--overflow-menu-target="item"` - Overflow menu items
- `data-bridge-title="..."` - Native app button titles (use i18n here too)

**Example**:
```erb
<%= link_to path, data: {
      bridge__overflow_menu_target: "item",
      bridge_title: t("notifications.index.settings_button")
    } do %>
```

## New i18n Keys to Add

When upstream adds new features with hardcoded text, add Vietnamese translations:

1. Identify the English text in upstream
2. Add key to `config/locales/vi.yml`
3. Replace hardcoded text with `t()` helper

## Major Upstream Features

### Import/Export (added 2025)

Account data can be exported and imported as ZIP files:
- Export: `app/views/account/settings/_export.html.erb`
- Import: `app/views/account/imports/new.html.erb`
- User data export: `app/views/users/_data_export.html.erb`

Import link location changed from account menu to signup completion page.

### Mobile/Native App Support

Upstream is preparing for iOS/Android native apps via Hotwire Native:
- Associated domains for deep linking
- Bridge data attributes for native buttons
- Hidden settings sections on native apps (push notifications, theme, developer)
- Notifications Tray JSON API for mobile apps

### Lexxy Editor (Feb 2025)

Rich text editor upgraded from Trix to Lexxy:
- Class renamed: `rich-text-content` → `lexxy-content`
- Dark mode support
- Improved table styles
- Better link dialog

### Notification Stacking (Feb 2025)

Server-side notification grouping:
- Multiple updates to same card grouped together
- Email notifications grouped by board
- New database columns: `card_id`, `unread_count`

## Testing After Merge

```bash
bin/rails test                 # Unit tests
bin/rails test:system          # System tests (if time permits)
```

## Deployment

Uses Coolify with Docker. Key environment variables:
- `BASE_URL=https://do.chip.vn`
- `SECRET_KEY_BASE=...`
- `RAILS_ENV=production`
- `VAPID_PRIVATE_KEY=...` (for push notifications)
- `VAPID_PUBLIC_KEY=...`

### Volume Mount for SQLite Persistence

Coolify mounts `/data/fizzy/db` → `/rails/db` to persist SQLite databases between deploys.

**Problem**: Volume mount overwrites migration files from Docker image.

**Solution** (implemented in `Dockerfile` and `bin/docker-entrypoint`):

```
Docker build:
  /rails/db/      ← migrate/, schema.rb, seeds.rb (from source)
  /rails/db.bak/  ← backup copy (RUN cp -r before USER switch)

Container start:
  /rails/db/      ← only SQLite files from persistent volume
  /rails/db.bak/  ← intact (not mounted)

Entrypoint:
  1. Restore migrate/, schema*.rb from db.bak → db
  2. Run db:prepare (applies new migrations)
  3. Start server
```

**Files involved**:
- `Dockerfile`: `RUN cp -r /rails/db /rails/db.bak` (before `USER 1000:1000`)
- `bin/docker-entrypoint`: Copies migration files from backup at startup

**Data safety**: Only migration files (Ruby code) are synced. SQLite data files (`*.sqlite3`) are never touched.

### Gemfile Changes

When adding/removing gems:
1. Edit `Gemfile`
2. Run `bundle install`
3. Commit both `Gemfile` AND `Gemfile.lock`

Docker builds in frozen mode - missing lockfile updates will fail the build.
