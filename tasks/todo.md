# Current Tasks

## Active

- [ ] (None currently)

## Completed

### 2024-02-24: Upstream sync and deployment fixes
- [x] Merge 117 commits (Rails upgrade, notifications API, dialog UX)
- [x] Merge 42 commits (security patches, search fix, mobile improvements)
- [x] Fix Dockerfile permission issue (USER directive ordering)
- [x] Fix Gemfile.lock sync for rails-i18n
- [x] Update CLAUDE.md with deployment documentation
- [x] Add workflow orchestration guidelines

---

## Review Notes

### Deployment Fix
- Volume mount `/data/fizzy/db` → `/rails/db` was overwriting migration files
- Solution: Backup to `db.bak` during build, restore at container startup
- Data safety: Only migration files synced, SQLite data untouched

### Merge Patterns Documented
- 8 common conflict patterns in CLAUDE.md
- 22 files that commonly have conflicts listed
