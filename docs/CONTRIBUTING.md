# Contributing

## Getting Started

1. Fork the repository and create your branch from `main`
2. Follow the [Development Guide](DEVELOPMENT.md) to set up your local environment
3. Make your changes, then run `npm run lint:fix` and `npm run typecheck`
4. Open a pull request against `main`

---

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/short-description` | `feat/formula-card-sm2` |
| Bug fix | `fix/short-description` | `fix/streak-reset-logic` |
| Refactor | `refactor/short-description` | `refactor/session-persistence` |
| Docs | `docs/short-description` | `docs/architecture-update` |

---

## Commit Messages

Every commit must start with the current version number (see [Versioning](DEVELOPMENT.md#versioning)):

```
v1.2.3: short description of the change
```

For CI/tooling commits where a version bump is not applicable, prefix with the type:

```
chore: update daily questions [skip ci]
docs: fix typo in CONTRIBUTING.md
```

---

## Pull Request Guidelines

- One feature or fix per PR — keep scope focused
- Describe what changed and why in the PR description
- `npm run lint` must pass with no errors (web and/or mobile)
- Test on mobile viewport (390 px) if changing web UI; test on a real device if changing mobile

---

## Code Conventions

- **No backend** — all state is `localStorage` / `AsyncStorage` only
- **Russian UI** — all user-facing strings are in Russian
- **Mobile-first** — design for 390 px max-width on web; test on real Android for mobile
- **CSS variables for web colors** — use `style={{ color: "var(--text)" }}`, not Tailwind color classes
- **`theme` object for mobile colors** — use `useTheme()`, never hardcode colors except `#F97316` (accent)
- **Minimal abstractions** — three similar lines of code is better than a premature helper

---

## What to Work On

Open GitHub issues are the best place to pick up work. Check the `bug` and `enhancement` labels.

---

## Reporting Bugs

Use the [bug report issue template](.github/ISSUE_TEMPLATE/bug_report.md). Include:
- Steps to reproduce
- Expected vs actual behaviour
- Platform (Web PWA / Android APK), device, OS, app version
- Screenshots if relevant

For **security vulnerabilities**, see [SECURITY.md](../SECURITY.md) — do not open a public issue.
