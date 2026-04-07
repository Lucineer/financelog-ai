# financelog-ai — Your Self-Hosted Financial Assistant

You don't need another finance app that sells your data. You need one you control.

Most financial AI tools lock you in, charge subscriptions, and operate as black boxes. This runs entirely on your infrastructure, communicates only with the LLM you provide, and never shares your data with any third party. Built for people who prefer transparency with their finances.

A single-file AI agent for financial conversations. Part of the Cocapn Fleet.

**Live Demo:** https://financelog-ai.casey-digennaro.workers.dev

---

## What it does
- Discuss budgets, investments, or plans with an AI using only the data you provide during the chat
- All processing occurs within your Cloudflare Worker—no external data storage
- Simple interface that works across devices
- You can audit and modify every line of the single source file

## How it's different
- No accounts, tracking, or analytics. Your financial data never leaves your infrastructure.
- You host it, removing any intermediary server between you and your LLM provider.
- Zero dependencies. One TypeScript file minimizes supply chain risk.
- Fork-first approach. This is a starting point you adapt, not a product you wait on.

**Limitation:** The agent is stateless by default—your conversation history and financial details exist only for the duration of your current chat session. You can implement persistence using Cloudflare KV if needed.

## Quick start
1. **Fork** this repository
2. **Deploy** to Cloudflare Workers: `npx wrangler deploy`
3. **Set your LLM key** as a secret in the Cloudflare dashboard

The agent supports DeepSeek, Moonshot, DeepInfra, and SiliconFlow. Add your key as `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `DEEPINFRA_API_KEY`, or `SILICONFLOW_API_KEY` via Settings → Variables in your Worker dashboard.

Standard Fleet endpoints are included: `/health`, `/setup`, `/api/chat`, `/api/seed`.

## Contributions
This is a Fleet vessel. Fork it, adapt it to your needs, and share improvements via pull requests.

## License
MIT License.

Superinstance & Lucineer (DiGennaro et al.).

---

<div>
  <a href="https://the-fleet.casey-digennaro.workers.dev">Fleet</a> · 
  <a href="https://cocapn.ai">Cocapn</a>
</div>