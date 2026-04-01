import {
  TransactionLog, BudgetManager, GoalTracker,
  InvestmentPortfolio, FinancialInsights,
} from './finance/tracker';

interface Env {
  DEEPSEEK_API_KEY: string;
}

const sessions = new Map<string, {
  txLog: TransactionLog;
  budgets: BudgetManager;
  goals: GoalTracker;
  portfolio: InvestmentPortfolio;
  insights: FinancialInsights;
}>();

function getSession(id: string) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      txLog: new TransactionLog(),
      budgets: new BudgetManager(),
      goals: new GoalTracker(),
      portfolio: new InvestmentPortfolio(),
      insights: new FinancialInsights(),
    });
  }
  return sessions.get(id)!;
}

const SESSION_ID = 'default';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function error(msg: string, status = 400) {
  return json({ error: msg }, status);
}

async function handleChat(body: { message: string; history?: { role: string; content: string }[] }, env: Env): Promise<Response> {
  const { message, history = [] } = body;
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) return error('DEEPSEEK_API_KEY not configured', 500);

  const systemPrompt = `You are a helpful financial advisor AI for financelog.ai. Help users with budgeting, savings goals, investment questions, and financial planning. Be concise and practical. Use specific numbers when relevant.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ];

  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages, stream: true }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return error(`DeepSeek API error: ${text}`, 502);
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function handleTransactions(method: string, body: any, url: URL) {
  const s = getSession(SESSION_ID);
  const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  if (method === 'GET') {
    return json({ transactions: s.txLog.list(month), summary: s.txLog.summary(month) });
  }

  if (method === 'POST') {
    const { amount, category, date, note } = body;
    if (amount == null || !category || !date) return error('amount, category, and date are required');
    const tx = s.txLog.add(Number(amount), category, date, note || '');
    if (tx.type === 'expense') s.budgets.recordExpense(category, date.slice(0, 7), tx.amount);
    return json(tx, 201);
  }

  if (method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) return error('id query param required');
    return json({ deleted: s.txLog.remove(id) });
  }

  return error('Method not allowed', 405);
}

function handleBudget(method: string, body: any, url: URL) {
  const s = getSession(SESSION_ID);
  const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  if (method === 'GET') {
    return json({ month, budgets: s.budgets.status(month) });
  }

  if (method === 'POST') {
    const { category, limit } = body;
    if (!category || limit == null) return error('category and limit required');
    return json(s.budgets.set(category, month, Number(limit)), 201);
  }

  return error('Method not allowed', 405);
}

function handleGoals(method: string, body: any, url: URL) {
  const s = getSession(SESSION_ID);

  if (method === 'GET') {
    return json({ goals: s.goals.list() });
  }

  if (method === 'POST') {
    if (body.action === 'contribute') {
      const goal = s.goals.contribute(body.id, Number(body.amount));
      if (!goal) return error('Goal not found');
      return json(goal);
    }
    const { name, target, deadline } = body;
    if (!name || !target || !deadline) return error('name, target, and deadline required');
    return json(s.goals.add(name, Number(target), deadline), 201);
  }

  if (method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) return error('id query param required');
    return json({ deleted: s.goals.remove(id) });
  }

  return error('Method not allowed', 405);
}

function handleInvestments(method: string, body: any, url: URL) {
  const s = getSession(SESSION_ID);

  if (method === 'GET') {
    return json({
      holdings: s.portfolio.summary(),
      totalValue: s.portfolio.totalValue(),
      totalGain: s.portfolio.totalGain(),
    });
  }

  if (method === 'POST') {
    const { action, symbol, shares, price } = body;
    if (!symbol || !shares) return error('symbol and shares required');

    if (action === 'sell') {
      return json({ success: s.portfolio.sell(symbol, Number(shares)) });
    }
    if (action === 'updatePrice') {
      s.portfolio.updatePrice(symbol, Number(body.currentPrice));
      return json({ updated: true });
    }
    // default: buy
    if (!price) return error('price required for buy');
    return json(s.portfolio.buy(symbol, Number(shares), Number(price)), 201);
  }

  return error('Method not allowed', 405);
}

function handleInsights(url: URL) {
  const s = getSession(SESSION_ID);
  const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  const report = s.insights.generate(month, s.txLog, s.budgets, s.goals, s.portfolio);
  return json(report);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Serve static HTML at root
    if (url.pathname === '/' || url.pathname === '/app.html') {
      return env.ASSETS?.fetch(request) ?? fetch(new URL('/app.html', url.origin));
    }

    // API routes
    let body: any = {};
    if (request.method === 'POST') {
      try { body = await request.json(); } catch { return error('Invalid JSON'); }
    }

    try {
      switch (url.pathname) {
        case '/api/chat':       return await handleChat(body, env);
        case '/api/transactions': return handleTransactions(request.method, body, url);
        case '/api/budget':     return handleBudget(request.method, body, url);
        case '/api/goals':      return handleGoals(request.method, body, url);
        case '/api/investments': return handleInvestments(request.method, body, url);
        case '/api/insights':   return handleInsights(url);
        default: return error('Not found', 404);
      }
    } catch (err: any) {
      return error(err.message ?? 'Internal error', 500);
    }
  },
};
