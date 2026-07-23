# Contributing to SolSentry

Thank you for your interest in contributing to SolSentry! We welcome contributions to expand protocol coverage, improve quantitative risk models, and strengthen guardrails for Solana AI agents.

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shieldspprt/solsentry.git
   cd solsentry
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Copy `.env.example` to `.env.local` and set required keys:
   ```bash
   cp .env.example .env.local
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Run Tests & Verification**:
   ```bash
   npm test
   npm run build
   ```

## Pull Request Guidelines

- Ensure all tests pass (`npm test`).
- Ensure the production build succeeds (`npm run build`).
- Keep code clean, type-safe, and follow component reuse patterns.
- Open a clear PR describing your changes.
