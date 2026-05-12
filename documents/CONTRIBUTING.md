# Contributing

Thanks for your interest in contributing to orioncart. This guide explains how to run the project locally and how to contribute changes.

## Branching & PRs
- Use feature branches with descriptive names: `feature/payment-checkout`, `fix/seeder-role`.
- Open a Pull Request with a clear description of changes and testing instructions.
- Keep changes focused and avoid unrelated refactors in the same PR.

## Coding style
- Java: follow existing Spring Boot and project conventions (packages under `com.orioncart.backend`).
- Frontend: React components in `frontend/src/components` and pages in `frontend/src/pages`.

## Running locally
- Backend: see `documents/README.md` for commands. Use the bundled Maven in `tools/apache-maven-3.9.6` for reproducible builds.
- Frontend: `npm install` then `npm run dev`.

## Tests
- Add unit tests near the code you change. Run backend tests with Maven.

## Reporting issues
- Create an issue describing what you tried, expected behavior, actual behavior, and steps to reproduce.

## Security
- Do not include secrets in commits. Move secrets into environment variables and document required variables in `documents/README.md`.

## Attribution
This project was built interactively in VS Code with AI-assisted development. See `documents/PROJECT_SUMMARY.md` for details.

