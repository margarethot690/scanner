# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and [Conventional Commits](https://www.conventionalcommits.org/).

## [1.0.0] - 2026-03-11

### Added

- **Blockchain Explorer** — Block feed, block detail, transaction view, transaction map, address pages, and asset pages
- **Network Dashboard** — Real-time network statistics, block height, TPS, and active node count
- **DEX Pairs** — Decentralized exchange pair browser with price and volume data
- **Network Map** — Interactive geographic visualization of DCC network nodes (Leaflet)
- **Peers List** — Connected peer monitoring with version, height, and latency
- **Node Registration** — Public registration form for community node operators
- **Admin Panel** — User management, node approval, role assignment, and system configuration
- **Admin Analytics** — User growth, page views, and system health dashboards
- **Sustainability Metrics** — Energy and environmental data for the DCC PoS network
- **Authentication System** — Email/password registration and login with role-based access control
- **User Dashboard** — Personal dashboard with watched addresses and bookmarked transactions
- **User Profile** — Profile management with display name and preferences
- **Unconfirmed Transactions** — Real-time mempool viewer
- **Distribution Tool** — Token distribution utility for node operators
- **Global Search** — Instant search across blocks, transactions, and addresses
- **Dark/Light Theme** — System-aware theming with manual toggle
- **Internationalization** — English and Spanish translations
- **Error Boundary** — Graceful error handling with recovery UI
- **Protected Routes** — Authentication and role-based route guards
- **CI/CD Pipeline** — GitHub Actions with lint, typecheck, test, and build
- **Docker Deployment** — Multi-stage production build with Nginx
- **Unit Tests** — Vitest + React Testing Library test suite
- **E2E Tests** — Playwright end-to-end test suite
- **44+ UI Components** — Full Radix UI + shadcn/ui component library

### Changed

- Replaced Base44 SDK with standalone authentication and entity systems
- Replaced platform-hosted functions with direct DCC blockchain API calls
- Renamed package from `base44-app` to `dccscan`

### Removed

- `@base44/sdk` dependency
- `@base44/vite-plugin` dependency
- All Base44 platform dependencies

[1.0.0]: https://github.com/dylanpersonguy/explorer/releases/tag/v1.0.0
