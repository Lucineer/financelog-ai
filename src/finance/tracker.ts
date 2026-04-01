// financelog-ai — Finance Tracker Modules
// All in-memory storage backed by KV in production

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string;
  type: 'income' | 'expense';
  created: string;
}

export interface BudgetEntry {
  category: string;
  month: string; // YYYY-MM
  limit: number;
  spent: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  created: string;
}

export interface Investment {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  bought: string;
}

export interface InsightReport {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  topCategories: { category: string; amount: number }[];
  netWorth: number;
  budgetUtilization: { category: string; pct: number }[];
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── TransactionLog ──────────────────────────────────────────────
export class TransactionLog {
  private transactions: Transaction[] = [];

  add(amount: number, category: string, date: string, note: string): Transaction {
    const tx: Transaction = {
      id: uid(),
      amount: Math.abs(amount),
      category,
      date,
      note,
      type: amount >= 0 ? 'income' : 'expense',
      created: new Date().toISOString(),
    };
    this.transactions.push(tx);
    return tx;
  }

  list(month?: string): Transaction[] {
    let txs = [...this.transactions].sort((a, b) => b.date.localeCompare(a.date));
    if (month) txs = txs.filter(t => t.date.startsWith(month));
    return txs;
  }

  remove(id: string): boolean {
    const idx = this.transactions.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.transactions.splice(idx, 1);
    return true;
  }

  summary(month: string) {
    const txs = this.list(month);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expenses, net: income - expenses, count: txs.length };
  }
}

// ── BudgetManager ───────────────────────────────────────────────
export class BudgetManager {
  private budgets: Map<string, BudgetEntry> = new Map();

  private key(category: string, month: string) {
    return `${month}:${category}`;
  }

  set(category: string, month: string, limit: number): BudgetEntry {
    const k = this.key(category, month);
    const existing = this.budgets.get(k);
    const entry: BudgetEntry = { category, month, limit, spent: existing?.spent ?? 0 };
    this.budgets.set(k, entry);
    return entry;
  }

  recordExpense(category: string, month: string, amount: number) {
    const k = this.key(category, month);
    const entry = this.budgets.get(k);
    if (entry) entry.spent += amount;
  }

  list(month: string): BudgetEntry[] {
    const results: BudgetEntry[] = [];
    for (const entry of this.budgets.values()) {
      if (entry.month === month) results.push(entry);
    }
    return results;
  }

  status(month: string) {
    const entries = this.list(month);
    return entries.map(e => ({
      ...e,
      pct: e.limit > 0 ? Math.round((e.spent / e.limit) * 100) : 0,
      remaining: Math.max(0, e.limit - e.spent),
      over: e.spent > e.limit,
    }));
  }
}

// ── GoalTracker ─────────────────────────────────────────────────
export class GoalTracker {
  private goals: Goal[] = [];

  add(name: string, target: number, deadline: string): Goal {
    const goal: Goal = { id: uid(), name, target, saved: 0, deadline, created: new Date().toISOString() };
    this.goals.push(goal);
    return goal;
  }

  contribute(id: string, amount: number): Goal | null {
    const goal = this.goals.find(g => g.id === id);
    if (!goal) return null;
    goal.saved = Math.min(goal.target, goal.saved + amount);
    return goal;
  }

  list(): (Goal & { progress: number; remaining: number; onTrack: boolean })[] {
    return this.goals.map(g => {
      const progress = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
      const remaining = Math.max(0, g.target - g.saved);
      const daysLeft = Math.max(1, (new Date(g.deadline).getTime() - Date.now()) / 86400000);
      const totalDays = Math.max(1, (new Date(g.deadline).getTime() - new Date(g.created).getTime()) / 86400000);
      const onTrack = (g.saved / g.target) >= (1 - daysLeft / totalDays) * 0.9;
      return { ...g, progress, remaining, onTrack };
    });
  }

  remove(id: string): boolean {
    const idx = this.goals.findIndex(g => g.id === id);
    if (idx === -1) return false;
    this.goals.splice(idx, 1);
    return true;
  }
}

// ── InvestmentPortfolio ─────────────────────────────────────────
export class InvestmentPortfolio {
  private holdings: Investment[] = [];

  buy(symbol: string, shares: number, price: number): Investment {
    const existing = this.holdings.find(h => h.symbol === symbol);
    if (existing) {
      const totalShares = existing.shares + shares;
      existing.avgCost = (existing.avgCost * existing.shares + price * shares) / totalShares;
      existing.shares = totalShares;
      return existing;
    }
    const inv: Investment = {
      id: uid(), symbol, shares, avgCost: price, currentPrice: price,
      bought: new Date().toISOString(),
    };
    this.holdings.push(inv);
    return inv;
  }

  sell(symbol: string, shares: number): boolean {
    const holding = this.holdings.find(h => h.symbol === symbol);
    if (!holding || holding.shares < shares) return false;
    holding.shares -= shares;
    if (holding.shares === 0) {
      this.holdings = this.holdings.filter(h => h.symbol !== symbol);
    }
    return true;
  }

  updatePrice(symbol: string, price: number) {
    const holding = this.holdings.find(h => h.symbol === symbol);
    if (holding) holding.currentPrice = price;
  }

  summary() {
    return this.holdings.map(h => {
      const value = h.shares * h.currentPrice;
      const cost = h.shares * h.avgCost;
      const gain = value - cost;
      const gainPct = cost > 0 ? Math.round((gain / cost) * 100) : 0;
      return { ...h, value, cost, gain, gainPct };
    });
  }

  totalValue(): number {
    return this.summary().reduce((s, h) => s + h.value, 0);
  }

  totalGain(): number {
    return this.summary().reduce((s, h) => s + h.gain, 0);
  }
}

// ── FinancialInsights ───────────────────────────────────────────
export class FinancialInsights {
  generate(
    month: string,
    txLog: TransactionLog,
    budgets: BudgetManager,
    goals: GoalTracker,
    portfolio: InvestmentPortfolio,
  ): InsightReport {
    const { income, expenses } = txLog.summary(month);
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

    const txs = txLog.list(month);
    const catMap = new Map<string, number>();
    for (const tx of txs) {
      if (tx.type === 'expense') catMap.set(tx.category, (catMap.get(tx.category) ?? 0) + tx.amount);
    }
    const topCategories = [...catMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const budgetStatus = budgets.status(month);
    const budgetUtilization = budgetStatus.map(b => ({ category: b.category, pct: b.pct }));

    const netWorth = income - expenses + portfolio.totalValue() + goals.list().reduce((s, g) => s + g.saved, 0);

    return { month, totalIncome: income, totalExpenses: expenses, savingsRate, topCategories, netWorth, budgetUtilization };
  }
}
