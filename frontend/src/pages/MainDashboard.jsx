import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, LogOut, Search, ShieldCheck, Sparkles, TrendingUp, User2, AlertTriangle, CheckCircle, Trash2, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";
const categories = ["All", "Food", "Housing", "Transport", "Shopping", "Entertainment", "Utilities", "Healthcare", "Salary", "Freelance", "Other"];
const timeRanges = ["All", "Monthly", "Weekly", "Yearly"];
const accentColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

const parseRange = (range) => {
  const now = new Date();
  if (range === "Weekly") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (range === "Monthly") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (range === "Yearly") {
    return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }
  return null;
};

const buildCategoryTotals = (items) => {
  const totals = {};
  items.forEach((item) => {
    if (!totals[item.category]) totals[item.category] = 0;
    totals[item.category] += Number(item.amount || 0);
  });
  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
};

const getMonthlyExpense = (transactions) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === "expense" && 
        txDate.getMonth() === currentMonth && 
        txDate.getFullYear() === currentYear;
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
};

const MainDashboard = () => {
  const { user, authHeader, logout } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [timeRange, setTimeRange] = useState("Monthly");
  const [goal, setGoal] = useState(() => Number(localStorage.getItem("expense_tracker_goal") || 0));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formState, setFormState] = useState({
    type: "expense",
    description: "",
    amount: "",
    category: "Food",
    date: new Date().toISOString().slice(0, 10),
  });

  const apiOptions = { headers: { ...authHeader, "Content-Type": "application/json" } };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const [incomeRes, expenseRes] = await Promise.all([
        axios.get(`${API_BASE}/income/get`, apiOptions),
        axios.get(`${API_BASE}/expense/get`, apiOptions),
      ]);

      const incomes = Array.isArray(incomeRes.data?.data) ? incomeRes.data.data : [];
      const expenses = Array.isArray(expenseRes.data?.data) ? expenseRes.data.data : [];

      const allTransactions = [
        ...incomes.map((item) => ({ ...item, type: "income" })),
        ...expenses.map((item) => ({ ...item, type: "expense" })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setTransactions(allTransactions);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load your transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [authHeader]);

  const totalIncome = useMemo(
    () => transactions.reduce((sum, tx) => (tx.type === "income" ? sum + Number(tx.amount || 0) : sum), 0),
    [transactions]
  );
  const totalExpense = useMemo(
    () => transactions.reduce((sum, tx) => (tx.type === "expense" ? sum + Number(tx.amount || 0) : sum), 0),
    [transactions]
  );
  const savings = totalIncome - totalExpense;
  const goalProgress = goal ? Math.min(100, Math.round((savings / goal) * 100)) : 0;

  const rangeFilter = parseRange(timeRange);
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (viewMode === "income" && tx.type !== "income") return false;
      if (viewMode === "expense" && tx.type !== "expense") return false;
      if (categoryFilter !== "All" && tx.category !== categoryFilter) return false;
      if (searchTerm && !tx.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (rangeFilter) {
        const date = new Date(tx.date);
        if (date < rangeFilter.start || date > rangeFilter.end) return false;
      }
      return true;
    });
  }, [transactions, viewMode, categoryFilter, searchTerm, rangeFilter]);

  const chartData = useMemo(() => buildCategoryTotals(filteredTransactions.filter((tx) => tx.type === "expense")), [filteredTransactions]);
  const balanceData = useMemo(
    () => [
      { name: "Income", value: totalIncome },
      { name: "Expense", value: totalExpense },
    ],
    [totalIncome, totalExpense]
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const submitTransaction = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!formState.description.trim() || !formState.amount) {
      setError("Please fill in description and amount.");
      return;
    }

    try {
      setLoading(true);
      const endpoint = formState.type === "income" ? "income/add" : "expense/add";
      await axios.post(`${API_BASE}/${endpoint}`, {
        description: formState.description.trim(),
        amount: Number(formState.amount),
        category: formState.category,
        date: formState.date,
      }, apiOptions);
      await fetchTransactions();
      setFormState((prev) => ({ ...prev, description: "", amount: "", date: new Date().toISOString().slice(0, 10) }));
      setMessage("Transaction added successfully.");
    } catch (err) {
      console.error(err);
      setError("Unable to save transaction.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tx) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/${tx.type}/delete/${tx._id}`, apiOptions);
      await fetchTransactions();
      setMessage("Transaction removed.");
    } catch (err) {
      console.error(err);
      setError("Failed to delete transaction.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type) => {
    try {
      const response = await axios.get(`${API_BASE}/${type}/downloadexcel`, { ...apiOptions, responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `${type}-transactions.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage("Export started successfully.");
    } catch (err) {
      console.error(err);
      setError("Unable to export data.");
    }
  };

  const saveGoal = () => {
    localStorage.setItem("expense_tracker_goal", String(goal));
    setMessage("Budget goal saved.");
  };

  return (
    <div className="main-container">
      <header className="page-header">
        <div>
          <p className="app-label">ExpensePro</p>
          <h1 className="app-title">Modern finance control for working professionals</h1>
          <p className="app-description">Securely store your income and expenses, view progress, and export reports in seconds.</p>
        </div>
        <div className="header-actions">
          <Link to="/profile" className="secondary-button">
            <User2 size={18} /> Profile
          </Link>
          <button type="button" className="secondary-button" onClick={logout}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </header>

      <section className="overview-grid">
        <article className="stat-card stat-card--accent">
          <div className="stat-card__icon"><TrendingUp size={18} /></div>
          <span className="summary-label">Income</span>
          <strong>{formatCurrency(totalIncome)}</strong>
          <p>All incoming funds</p>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><ShieldCheck size={18} /></div>
          <span className="summary-label">Expense</span>
          <strong>{formatCurrency(totalExpense)}</strong>
          <p>Spendings recorded</p>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><Sparkles size={18} /></div>
          <span className="summary-label">Savings</span>
          <strong>{formatCurrency(savings)}</strong>
          <p>Remaining balance</p>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><Zap size={18} /></div>
          <span className="summary-label">Goal progress</span>
          <strong>{goal ? `${goalProgress}%` : "—"}</strong>
          <p>{goal ? `Target ${formatCurrency(goal)}` : "Set a monthly goal"}</p>
        </article>
      </section>

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="panel panel--sidebar">
            <div className="panel-header">
              <h2>New transaction</h2>
            </div>
            <form className="transaction-form" onSubmit={submitTransaction}>
              <label>
                Type
                <select name="type" value={formState.type} onChange={handleFormChange}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <label>
                Description
                <input
                  name="description"
                  value={formState.description}
                  onChange={handleFormChange}
                  placeholder="e.g. Freelance project"
                />
              </label>
              <label>
                Amount
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formState.amount}
                  onChange={handleFormChange}
                  placeholder="0.00"
                />
              </label>
              <label>
                Category
                <select name="category" value={formState.category} onChange={handleFormChange}>
                  {categories.slice(1).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  name="date"
                  type="date"
                  value={formState.date}
                  onChange={handleFormChange}
                />
              </label>
              <button type="submit" className="primary-button full-width" disabled={loading}>
                {loading ? "Saving..." : "Add transaction"}
              </button>
            </form>
          </div>

          <div className="panel panel--sidebar panel--goal">
            <div className="panel-header">
              <h2>Monthly goal</h2>
            </div>
            <label>
              Target amount
              <input
                type="number"
                value={goal}
                onChange={(event) => setGoal(Number(event.target.value))}
                placeholder="0"
              />
            </label>
            <button type="button" className="secondary-button full-width" onClick={saveGoal}>
              Save goal
            </button>
            {goal > 0 && (
              <>
                <div className="goal-meter">
                  <span className="goal-meter__fill" style={{ width: `${goalProgress}%` }} />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '10px' }}>
                  {goalProgress <= 100 ? `${goalProgress}% of ${formatCurrency(goal)}` : `Exceeded budget by ${formatCurrency(getMonthlyExpense(transactions) - goal)}`}
                </p>
              </>
            )}
          </div>

          {goal > 0 && getMonthlyExpense(transactions) >= goal * 0.8 && (
            <div style={{ padding: '16px', borderRadius: '18px', background: getMonthlyExpense(transactions) > goal ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', border: getMonthlyExpense(transactions) > goal ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                {getMonthlyExpense(transactions) > goal ? <AlertTriangle size={18} style={{ color: '#ef4444' }} /> : <AlertTriangle size={18} style={{ color: '#f59e0b' }} />}
                <span style={{ fontWeight: 600, color: getMonthlyExpense(transactions) > goal ? '#fecaca' : '#fed7aa' }}>
                  {getMonthlyExpense(transactions) > goal ? 'Budget exceeded!' : 'Approaching budget limit'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: getMonthlyExpense(transactions) > goal ? '#fecaca' : '#fed7aa', margin: 0 }}>
                You have spent {formatCurrency(getMonthlyExpense(transactions))} out of {formatCurrency(goal)}.
              </p>
            </div>
          )}
        </aside>

        <section className="dashboard-content">
          <div className="panel panel--grow">
            <div className="panel-header panel-header--spaced">
              <div>
                <h2>Transactions</h2>
                <p className="panel-description">Filter, review, and export your latest transaction data.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => handleDownload(viewMode === "income" ? "income" : viewMode === "expense" ? "expense" : "expense") }>
                <Download size={16} /> Export data
              </button>
            </div>

            {error && <div className="alert alert--error">{error}</div>}
            {message && <div className="alert alert--success">{message}</div>}

            <div className="filters-row">
              <div className="tab-group">
                {['all', 'income', 'expense'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`tab-pill ${viewMode === item ? 'tab-pill--active' : ''}`}
                    onClick={() => setViewMode(item)}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </button>
                ))}
              </div>

              <div className="filter-row">
                <label className="search-box">
                  <Search size={16} />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search transactions"
                  />
                </label>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
                  {timeRanges.map((range) => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="chart-card">
                <div className="chart-card__header">
                  <h3>Expense by category</h3>
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.2)" vertical={false} />
                      <XAxis dataKey="category" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={{ stroke: "rgba(203, 213, 225, 0.2)" }} />
                      <YAxis tickFormatter={formatCurrency} tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={{ stroke: "rgba(203, 213, 225, 0.2)" }} />
                      <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: "rgba(20, 29, 48, 0.95)", border: "1px solid rgba(203, 213, 225, 0.2)" }} />
                      <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                      <Bar dataKey="amount" radius={[12, 12, 0, 0]} fill="#3b82f6">
                        {chartData.map((entry, index) => (
                          <Cell key={entry.category} fill={accentColors[index % accentColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state small">Add more expenses to reveal category insights.</div>
                )}
              </div>

              <div className="chart-card chart-card--alt">
                <div className="chart-card__header">
                  <h3>Balance view</h3>
                </div>
                {transactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={balanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fill: '#cbd5e1', fontSize: 12 }} />
                      {balanceData.map((entry, index) => (
                        <Cell key={entry.name} fill={index === 0 ? '#10b981' : '#ef4444'} />
                      ))}
                      <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: "rgba(20, 29, 48, 0.95)", border: "1px solid rgba(203, 213, 225, 0.2)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state small">Your income and expense data will appear here.</div>
                )}
              </div>
            </div>

            <div className="transaction-list">
              {filteredTransactions.length === 0 ? (
                <div className="empty-state">There are no transactions for the selected filters.</div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div key={tx._id} className="transaction-row">
                    <div>
                      <div className="transaction-row__title">{tx.description || "Untitled transaction"}</div>
                      <div className="transaction-row__meta">{tx.category} • {new Date(tx.date).toLocaleDateString()}</div>
                    </div>
                    <div className="transaction-row__actions">
                      <span className={`transaction-amount ${tx.type === "income" ? "transaction-amount--income" : "transaction-amount--expense"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                      <button type="button" className="icon-button" onClick={() => handleDelete(tx)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MainDashboard;
