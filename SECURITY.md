# Security Policy

## Supported Versions

Only the latest version of Flux is actively maintained.

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Scope

Flux is a **client-side-only** application. All user data is stored locally on the device (`localStorage` / `AsyncStorage`). There is no backend database, no user accounts, and no personal data is transmitted to any server except:

- `GET https://flux-training.vercel.app/daily-questions.json` — fetches daily-generated questions (no user data sent)
- `POST /api/generate` — optional Vercel serverless endpoint for on-demand questions; accepts only `{ topic, count, difficulty, formulaContext }` (no user data)

### In scope
- Injection vulnerabilities in the Vercel serverless functions (`api/`)
- Secrets accidentally committed to the repository
- Dependency vulnerabilities with clear exploit path
- Content Security Policy bypass in the PWA

### Out of scope
- Attacks requiring physical access to the user's device
- Brute-force against user data (there is no authentication)
- Social engineering
- Denial-of-service against the free Vercel/Expo hosting tier

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately by emailing the project maintainer or using
[GitHub's private vulnerability reporting](https://github.com/knyazin47/flux/security/advisories/new).

Include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You can expect an acknowledgment within **72 hours** and a resolution timeline within **14 days** for confirmed issues.

## Secrets Management

All secrets (Anthropic API key, Claude OAuth credentials) are stored exclusively in:
- **Vercel environment variables** — never in the repository
- **GitHub Actions secrets** — referenced as `${{ secrets.NAME }}`, never hardcoded

The repository contains **no real credentials**. If you find what looks like a leaked secret, please report it immediately.
