# Contributing

## Getting Started

1. Fork the repository and create your branch from `master`
2. Follow the [Development Guide](DEVELOPMENT.md) to set up your local environment
3. Make your changes, then run `npm run lint:fix` and `npm run typecheck`
4. Open a pull request against `master`

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

Use the conventional commits format:

```
type(scope): short description

Optional longer body.
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`

Examples:
```
feat(tasks): add resume modal for in-progress sessions
fix(progress): read correct localStorage keys for XP and streak
docs: add architecture overview to docs/
```

---

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Describe what changed and why in the PR description
- Ensure `npm run lint` passes with no errors
- Test on mobile viewport (max-width 390px) if changing UI

---

## What to Work On

See [PLAN.md](../PLAN.md) for the phased roadmap. Open issues are the best place to pick up work.

Current priorities:
1. Connect real question data to Tasks, Theory, and MockExam pages
2. Wire up all localStorage writes (XP, topic stats, achievements) on session completion
3. PWA manifest + service worker
4. Push notifications

---

## Code Conventions

- **No backend** — all state is `localStorage` only
- **Russian UI** — all user-facing strings are in Russian
- **Mobile-first** — design for 390px max-width, test on real devices if possible
- **CSS variables for colors** — use `style={{ color: "var(--text)" }}`, not Tailwind color classes
- **Minimal abstractions** — don't generalize prematurely; three similar lines of code is better than a premature helper

---

## Reporting Bugs

Open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behavior
- Device / browser / OS
- Screenshots if relevant (especially for layout bugs)
