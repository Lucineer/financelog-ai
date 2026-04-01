# financelog.ai

Personal finance vessel — track transactions, budgets, savings goals, and investments with an AI advisor. Built on Cloudflare Workers.

## Stack

- **Runtime:** Cloudflare Workers (TypeScript)
- **Frontend:** Single-page HTML + vanilla JS (no build step)
- **AI:** DeepSeek chat via SSE streaming
- **Storage:** In-memory (swap to KV/D1 for persistence)

## Project structure

```
src/
  index.ts              Worker entry — all API routes
  finance/
    tracker.ts          TransactionLog, BudgetManager, GoalTracker, InvestmentPortfolio, FinancialInsights
public/
  app.html              Finance dashboard UI
```

## API

| Endpoint | Methods | Description |
|---|---|---|
| `POST /api/chat` | POST | SSE chat with DeepSeek financial advisor |
| `/api/transactions` | GET, POST, DELETE | Transaction log (amount, category, date, note) |
| `/api/budget` | GET, POST | Monthly budgets by category |
| `/api/goals` | GET, POST, DELETE | Savings goals with progress tracking |
| `/api/investments` | GET, POST | Portfolio holdings (buy/sell/update price) |
| `/api/insights` | GET | Spending patterns, savings rate, net worth |

## Quick start

```bash
npm install
npx wrangler dev
```

Set your DeepSeek API key in `wrangler.toml` or via `wrangler secret put DEEPSEEK_API_KEY`.

## Deploy

```bash
npx wrangler deploy
```

## Author

Superinstance
