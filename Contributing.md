# Contributing to Bet EV

Thanks for your interest in contributing! This guide covers local setup, coding standards, how to propose changes, and release hygiene so we can ship fast without breaking things.

---

## 🧰 Tech Overview

- **Frontend:** React (Vite), Tailwind, shadcn/ui
- **Backend:** Node.js / Express (Python optional for EV math)
- **DB:** PostgreSQL
- **Odds Provider:** DraftKings (initial)
- **Payments:** Stripe (subscriptions)
- **Style & Quality:** TypeScript, ESLint, Prettier, Vitest/Jest, Playwright

> Goal: fast iteration with strict lint/tests at PR time.

---

## 🖥️ Local Setup

1. **Fork & Clone**
   ```bash
   git clone https://github.com/<kriener056-byte>/bet-ev.git
   cd bet-ev
