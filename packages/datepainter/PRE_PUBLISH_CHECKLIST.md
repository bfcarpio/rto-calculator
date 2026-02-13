# Pre-Publishing Checklist

Use this comprehensive checklist before publishing the `datepainter` package to ensure quality, reliability, and a smooth release process.

---

## 1. Code Quality

- [ ] **All linting passes** (npm run lint)
- [ ] **TypeScript compilation succeeds** (npm run check)
- [ ] **No TODO/FIXME/HACK comments in source code**
- [ ] **Code follows 5 Laws of Elegant Defense**
  - Early Exit: Guard clauses handle edge cases at top
  - Parse, Don't Validate: Data parsed at boundaries, trusted internally
  - Atomic Predictability: Pure functions where possible
  - Fail Fast: Invalid states halt with descriptive errors
  - Intentional Naming: Code reads like English

---

## 2. Testing

- [ ] **All unit tests pass** (npm run test:run)
- [ ] **All integration tests pass**
- [ ] **Test coverage meets 75%+ threshold for core logic**
- [ ] **E2E tests passing** (if applicable)

---

## 3. Build Verification

- [ ] **Production build succeeds** (npm run build)
- [ ] **TypeScript declarations generated correctly**
- [ ] **Bundle size within limits** (<100KB uncompressed, <50KB gzipped)
- [ ] **Source maps generated**
- [ ] **ESM output validates**
- [ ] **Tree-shaking verified** (named exports only)

---

## 4. Package Metadata

- [ ] **package.json has correct name** (datepainter)
- [ ] **package.json has proper version** (SemVer)
- [ ] **package.json has accurate description**
- [ ] **package.json has relevant keywords**
- [ ] **package.json has repository URL**
- [ ] **package.json has correct license** (MIT)
- [ ] **package.json has proper exports field**
- [ ] **package.json has proper types field**
- [ ] **files field includes**: `dist/`, `README.md`, `LICENSE`
- [ ] **files field excludes**: `node_modules`, `__tests__`, `.git`

---

## 5. Documentation

- [ ] **README.md is comprehensive and up-to-date**
- [ ] **README.md has installation instructions**
- [ ] **README.md has quick start guide**
- [ ] **README.md has usage examples**
- [ ] **API.md is complete**
- [ ] **Usage guides are accurate** (ASTRO_USAGE.md, VANILLA_USAGE.md)
- [ ] **Example projects work** (astro and vanilla)
- [ ] **CHANGELOG.md is up-to-date with latest changes**
- [ ] **JSDoc comments are present on all public APIs**

---

## 6. Dependencies

- [ ] **No unused dependencies**
- [ ] **All dependencies have correct versions**
- [ ] **Security audit passes** (npm audit)
- [ ] **peerDependencies are accurate**

---

## 7. Examples

- [ ] **Astro example runs successfully**
- [ ] **Vanilla example runs successfully**
- [ ] **Examples demonstrate all major features**
- [ ] **Examples have README files**

---

## 8. Git & Versioning

- [ ] **Current branch is clean** (no uncommitted changes)
- [ ] **All changes committed to appropriate branch**
- [ ] **Version number bumped** (npm version [patch|minor|major])
- [ ] **Git tag created for version**
- [ ] **Tag pushed to remote**

---

## 9. CI/CD Verification

- [ ] **All CI workflows pass on latest commit**
- [ ] **Release workflow configuration is correct**
- [ ] **NPM_TOKEN secret is configured** (for automated publish)
- [ ] **GITHUB_TOKEN secret is configured** (for releases)

---

## 10. Final Manual Checks

- [ ] **Package builds successfully from clean slate** (`rm -rf node_modules && npm install && npm run build`)
- [ ] **Can install published package in fresh project**
- [ ] **Can import and use package in test project**
- [ ] **All features work in test project**
- [ ] **No console errors or warnings in browser**

---

## Quick Command Reference

```bash
# Run all checks
npm run lint && npm run check && npm run test:run && npm run build

# Check bundle size
du -sh dist/

# Security audit
npm audit

# Dry-run publish
npm publish --dry-run
```

---

## Notes

- This checklist should be completed for every release
- Create a GitHub issue tracking the checklist progress if needed
- For major releases, consider a beta release phase first
- Keep CHANGELOG.md updated throughout development, not just at release time
