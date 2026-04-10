# CLAUDE.md

This file provides guidance to AI assistants (Claude Code and similar tools) working in this repository.

---

## Project Overview

**Repository**: `jodez30/claude`
**Purpose**: Claude code repository — a workspace for Claude-assisted development.
**Status**: Early initialization. The project is actively being built out.

---

## Repository Structure

```
/
├── CLAUDE.md          # This file — AI assistant guidance
└── README.md          # Project overview
```

As the project grows, update this structure section to reflect new directories and their purpose.

---

## Git Workflow

### Branches

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready code |
| `claude/<feature>-<id>` | AI-driven feature branches |

- **Never push directly to `main`** without explicit user approval.
- Feature branches follow the naming convention `claude/<short-description>-<id>`.
- Current active branch: `claude/add-claude-documentation-yBEEv`

### Commit Conventions

- Write clear, imperative commit messages (e.g., `Add authentication module`, not `added auth`).
- Keep commits focused — one logical change per commit.
- Always include a session link at the end of commit messages (format: `https://claude.ai/code/session_<id>`).

### Push Workflow

```bash
git push -u origin <branch-name>
```

On network failures, retry up to 4 times with exponential backoff: 2s → 4s → 8s → 16s.

---

## Development Conventions

### General Principles

- **Read before editing**: Always read a file before modifying it.
- **Minimal changes**: Make the smallest change that satisfies the requirement. Don't refactor surrounding code unless asked.
- **No speculative additions**: Don't add error handling, feature flags, helpers, or abstractions for hypothetical future needs.
- **No generated boilerplate**: Avoid adding docstrings, comments, or type annotations to code you didn't change.
- **No new files unless necessary**: Prefer editing existing files over creating new ones.

### Code Quality

- Avoid introducing security vulnerabilities (OWASP Top 10: SQL injection, XSS, command injection, etc.).
- Validate only at system boundaries (user input, external APIs). Trust internal code and framework guarantees.
- Three similar lines of code is better than a premature abstraction.

### Comments

Only add comments where the logic is not self-evident. Do not comment obvious operations.

---

## Testing

No test infrastructure has been set up yet.

When tests are added, document:
- The test runner and how to run tests
- Where test files live relative to source
- How to run a single test vs. the full suite
- Any required environment setup before running tests

---

## Environment & Configuration

No configuration or environment files exist yet.

When added, document here:
- Required environment variables (with `.env.example` reference)
- How to bootstrap a local development environment
- Any secrets management approach

---

## CI/CD

No CI/CD pipelines are configured yet.

When added, document here:
- Which workflows run on PR vs. push to `main`
- How to interpret CI failures
- Deployment targets and promotion process

---

## GitHub Integration

- Repository is restricted to `jodez30/claude` — do not interact with other repositories.
- Use GitHub MCP tools (prefixed `mcp__github__`) for all GitHub interactions.
- Do **not** create a pull request unless explicitly asked by the user.
- Be frugal with comments on PRs/issues — only comment when a reply genuinely adds value.

---

## AI Assistant Behavior Guidelines

### Before Starting Any Task

1. Read the relevant files — never modify code you haven't read.
2. Understand the existing patterns before proposing changes.
3. Scope work to exactly what was asked; do not expand scope.

### During Implementation

- Prefer editing existing files over creating new ones.
- Do not add markdown documentation files (`.md`) unless explicitly requested.
- Do not use emojis unless the user explicitly asks for them.
- Responses should be short and concise.

### After Implementation

- Run any available tests/linters to verify changes.
- Commit and push to the designated feature branch (not `main`).
- Do not open a PR unless the user explicitly requests one.

### Security

- Assist with authorized security testing, defensive security, CTF challenges, and educational contexts.
- Refuse requests for destructive techniques, DoS attacks, mass targeting, supply chain compromise, or detection evasion for malicious purposes.
- Dual-use security tools require clear authorization context before assisting.

---

## Updating This File

Keep this file current as the project evolves:
- When new directories are created, add them to the **Repository Structure** section.
- When a tech stack is chosen, add a **Tech Stack** section with setup instructions.
- When tests are added, fill in the **Testing** section.
- When CI/CD is configured, fill in the **CI/CD** section.
- When `.env` conventions are established, fill in the **Environment & Configuration** section.
