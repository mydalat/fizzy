# Lessons Learned

This file captures patterns and mistakes to prevent repeating them.

---

## Deployment & Docker

### 2024-02-24: Dockerfile USER directive ordering
**Mistake**: Placed `RUN cp -r /rails/db /rails/db.bak` after `USER 1000:1000`
**Result**: Permission denied - rails user can't create directories in /rails
**Fix**: Run backup command as root BEFORE switching to non-root user
**Rule**: Always check if RUN commands need root permissions before USER directive

### 2024-02-24: Gemfile.lock sync
**Mistake**: Added `rails-i18n` to Gemfile but didn't run `bundle install`
**Result**: Docker build failed in frozen mode
**Fix**: Always run `bundle install` and commit both Gemfile AND Gemfile.lock
**Rule**: Any Gemfile change → bundle install → commit both files

---

## Merge Conflicts

### Pattern: i18n vs hardcoded text
**Rule**: Always keep `t()` helpers, never revert to hardcoded English

### Pattern: CSS class renames
**Rule**: Use new class name from upstream, keep i18n for content
**Example**: `rich-text-content` → `lexxy-content`

### Pattern: Settings section wrapper
**Rule**: Adopt new `settings__section` wrapper, keep i18n inside

### Pattern: Feature relocation
**Rule**: Follow upstream's new location, add i18n there, remove from old location

---

## General

### Read before edit
**Rule**: Always read a file before attempting to edit it

### Verify before done
**Rule**: Never mark task complete without testing/verifying it works
