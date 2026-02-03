@../AGENTS.md

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

## Files That Commonly Have Conflicts

| File | Reason |
|------|--------|
| `app/views/boards/new.html.erb` | Form buttons, page title |
| `app/views/cards/_delete.html.erb` | Delete confirmation dialog |
| `app/views/cards/edit.html.erb` | Cancel link, placeholders |
| `app/views/cards/pins/_pin_button.html.erb` | Pin/unpin buttons |
| `app/views/notifications/index.html.erb` | Settings link |
| `app/views/filters/settings/_assignees.html.erb` | Filter dialog title |
| `app/views/layouts/application.html.erb` | Skip to content link |
| `app/views/layouts/public.html.erb` | CHIPVN branding |
| `app/views/sessions/_footer.html.erb` | Support email |
| `app/views/reactions/new.html.erb` | Reaction form labels |

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
