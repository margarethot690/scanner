# Contributing to DecentralScan

Thank you for your interest in contributing to DecentralScan! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/explorer.git
   cd explorer
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create a branch** for your work:
   ```bash
   git checkout -b feat/my-feature
   ```
5. **Start the dev server:**
   ```bash
   npm run dev
   ```

## Development Workflow

1. Make your changes in a feature branch
2. Write or update tests as needed
3. Run the full check suite before submitting:
   ```bash
   npm run lint          # Check code style
   npm run typecheck     # Check types
   npm run test:run      # Run unit tests
   npm run build         # Verify build succeeds
   ```
4. Commit your changes following the [commit convention](#commit-convention)
5. Push your branch and open a pull request

## Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semicolons, etc. (no code change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Changes to the build system or dependencies |
| `ci` | Changes to CI configuration |
| `chore` | Maintenance tasks |

### Examples

```
feat(explorer): add transaction receipt display
fix(auth): prevent duplicate session tokens
docs: update deployment instructions
test(dashboard): add network overview widget tests
```

## Pull Request Process

1. Fill out the pull request template completely
2. Ensure all CI checks pass (lint, typecheck, test, build)
3. Request a review from a maintainer
4. Address any review feedback
5. Once approved, a maintainer will merge your PR

### PR Title Format

Use the same conventional commit format for your PR title:
```
feat(scope): short description
```

## Coding Standards

### General

- Use **functional components** with hooks (no class components)
- Use **named exports** for components
- Keep components focused and single-responsibility
- Use `@/` path aliases for imports from `src/`

### Styling

- Use **Tailwind CSS** utility classes for styling
- Follow the existing color scheme via CSS variables
- Ensure all components support dark and light themes
- Use Radix UI primitives from `@/components/ui/` for interactive elements

### Testing

- Write unit tests for new components and utilities
- Place test files alongside the code they test (e.g., `Component.test.jsx`)
- Use React Testing Library's user-centric queries
- Add E2E tests in `e2e/` for critical user flows

### File Organization

```
src/
├── api/          # API modules and data layer
├── components/   # Reusable UI components
│   ├── ui/       # Radix UI primitives (shadcn/ui)
│   ├── shared/   # Shared components
│   └── ...       # Feature-specific components
├── hooks/        # Custom React hooks
├── lib/          # Contexts, utilities, config
├── pages/        # Page-level components (one per route)
└── utils/        # Utility functions
```

## Questions?

If you have questions about contributing, feel free to [open an issue](https://github.com/dylanpersonguy/explorer/issues/new) with the "question" label.

Thank you for helping make DecentralScan better! 🎉
