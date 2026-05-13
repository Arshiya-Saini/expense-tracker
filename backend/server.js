import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import crypto from "crypto";
import ExcelJS from "exceljs";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "data", "store.json");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const emptyStore = { incomes: [], expenses: [], users: [] };

const scryptAsync = (password, salt) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = await scryptAsync(password, salt);
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
}

async function ensureDataFile() {
  try {
    await fs.mkdir(path.join(__dirname, "data"), { recursive: true });
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(emptyStore, null, 2), "utf8");
  }
}

async function loadStore() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw || JSON.stringify(emptyStore));
  return {
    incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    users: Array.isArray(parsed.users) ? parsed.users : [],
  };
}

async function saveStore(store) {
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function parseRange(range) {
  const now = new Date();
  let start;
  switch ((range || "monthly").toLowerCase()) {
    case "daily":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "weekly":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "yearly":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "monthly":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }
  return { start, end: new Date() };
}

function filterByRange(items, range) {
  const { start, end } = parseRange(range);
  return items.filter((item) => {
    const date = new Date(item.date);
    return date >= start && date <= end;
  });
}

function buildSummary(items, range, type) {
  const filtered = filterByRange(items, range);
  const total = filtered.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const numberOfTransactions = filtered.length;
  const average = numberOfTransactions ? total / numberOfTransactions : 0;
  const recentTransactions = [...filtered]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 9)
    .map((item) => ({ ...item, type }));

  return {
    total: total,
    average: average,
    numberOfTransactions,
    recentTransactions,
    range: range || "monthly",
  };
}

function buildTransaction(payload, type) {
  return {
    _id: uuidv4(),
    description: String(payload.description || "").trim(),
    amount: Number(payload.amount) || 0,
    category: String(payload.category || (type === "income" ? "Salary" : "Other")),
    date: new Date(payload.date || new Date()).toISOString(),
    type,
    createdAt: new Date().toISOString(),
  };
}

function getCollectionName(type) {
  if (type === "income") return "incomes";
  if (type === "expense") return "expenses";
  return null;
}

function getWorkbookRows(items, type) {
  return items.map((item) => ({
    Date: new Date(item.date).toLocaleString(),
    Description: item.description,
    Category: item.category,
    Amount: Number(item.amount) || 0,
    Type: type,
  }));
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const store = await loadStore();
    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = store.users.find((user) => user.email === normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ success: false, message: "An account already exists with that email." });
    }

    const passwordHash = await hashPassword(password);
    const newUser = {
      _id: uuidv4(),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
      token: generateToken(),
    };
    store.users.push(newUser);
    await saveStore(store);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          createdAt: newUser.createdAt,
        },
        token: newUser.token,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to register user." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const store = await loadStore();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = store.users.find((item) => item.email === normalizedEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    user.token = generateToken();
    await saveStore(store);

    return res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        token: user.token,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to login." });
  }
});

app.get("/api/:type/get", async (req, res) => {
  try {
    const type = req.params.type;
    const collectionName = getCollectionName(type);
    if (!collectionName) return res.status(404).json({ success: false, message: "Invalid transaction type." });
    const store = await loadStore();
    return res.json({ success: true, data: store[collectionName] });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load transactions." });
  }
});

app.get("/api/:type/overview", async (req, res) => {
  try {
    const type = req.params.type;
    const collectionName = getCollectionName(type);
    const range = req.query.range || "monthly";
    if (!collectionName) return res.status(404).json({ success: false, message: "Invalid overview type." });
    const store = await loadStore();
    const summary = buildSummary(store[collectionName], range, type);
    const data = type === "expense" ? {
      totalExpense: summary.total,
      averageExpense: summary.average,
      numberOfTransactions: summary.numberOfTransactions,
      recentTransactions: summary.recentTransactions,
      range: summary.range,
    } : {
      totalIncome: summary.total,
      averageIncome: summary.average,
      numberOfTransactions: summary.numberOfTransactions,
      recentTransactions: summary.recentTransactions,
      range: summary.range,
    };
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to compute overview." });
  }
});

app.post("/api/:type/add", async (req, res) => {
  try {
    const type = req.params.type;
    const collectionName = getCollectionName(type);
    if (!collectionName) return res.status(404).json({ success: false, message: "Invalid add type." });
    const store = await loadStore();
    const transaction = buildTransaction(req.body, type);
    store[collectionName].unshift(transaction);
    await saveStore(store);
    return res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to add transaction." });
  }
});

app.put("/api/:type/update/:id", async (req, res) => {
  try {
    const type = req.params.type;
    const id = req.params.id;
    const collectionName = getCollectionName(type);
    if (!collectionName) return res.status(404).json({ success: false, message: "Invalid update type." });
    const store = await loadStore();
    const index = store[collectionName].findIndex((item) => item._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }
    const updated = {
      ...store[collectionName][index],
      description: String(req.body.description || store[collectionName][index].description).trim(),
      amount: Number(req.body.amount) || store[collectionName][index].amount,
      category: String(req.body.category || store[collectionName][index].category),
      date: new Date(req.body.date || store[collectionName][index].date).toISOString(),
    };
    store[collectionName][index] = updated;
    await saveStore(store);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update transaction." });
  }
});

app.delete("/api/:type/delete/:id", async (req, res) => {
  try {
    const type = req.params.type;
    const id = req.params.id;
    const collectionName = getCollectionName(type);
    if (!collectionName) return res.status(404).json({ success: false, message: "Invalid delete type." });
    const store = await loadStore();
    const initialCount = store[collectionName].length;
    store[collectionName] = store[collectionName].filter((item) => item._id !== id);
    if (store[collectionName].length === initialCount) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }
    await saveStore(store);
    return res.json({ success: true, message: "Transaction deleted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete transaction." });
  }
});

app.get("/api/:type/downloadexcel", async (req, res) => {
  try {
    const type = req.params.type;
    const collectionName = getCollectionName(type);
    if (!collectionName) return res.status(404).json({ success: false, message: "Invalid export type." });
    const store = await loadStore();
    const rows = getWorkbookRows(store[collectionName], type);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${type.charAt(0).toUpperCase() + type.slice(1)} Data`);
    sheet.columns = [
      { header: "Date", key: "Date", width: 25 },
      { header: "Description", key: "Description", width: 40 },
      { header: "Category", key: "Category", width: 25 },
      { header: "Amount", key: "Amount", width: 15 },
      { header: "Type", key: "Type", width: 15 },
    ];
    rows.forEach((row) => sheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `${type}_details_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to export Excel file." });
  }
});

app.get("/api/dashboard/overview", async (req, res) => {
  try {
    const range = req.query.range || "monthly";
    const store = await loadStore();
    const incomeSummary = buildSummary(store.incomes, range, "income");
    const expenseSummary = buildSummary(store.expenses, range, "expense");
    const monthlyIncome = incomeSummary.total;
    const monthlyExpense = expenseSummary.total;
    const savings = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome === 0 ? 0 : Math.round((savings / monthlyIncome) * 100);

    const spendByCategory = {};
    expenseSummary.recentTransactions.forEach((item) => {
      const category = item.category || "Other";
      spendByCategory[category] = (spendByCategory[category] || 0) + Number(item.amount || 0);
    });
    const expenseDistribution = Object.entries(spendByCategory).map(([category, amount]) => ({
      category,
      amount,
      percent: monthlyExpense === 0 ? 0 : Math.round((amount / monthlyExpense) * 100),
    }));

    const recentTransactions = [...incomeSummary.recentTransactions, ...expenseSummary.recentTransactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 9);

    return res.json({
      success: true,
      data: {
        monthlyIncome,
        monthlyExpense,
        savings,
        savingsRate,
        spendByCategory,
        expenseDistribution,
        recentTransactions,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load dashboard overview." });
  }
});

app.get("/api/health", (req, res) => res.json({ success: true, message: "Backend is running." }));

function createServer(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);
    server.once("listening", () => resolve(server));
    server.once("error", reject);
  });
}

async function startServer() {
  let port = Number(process.env.PORT) || PORT;
  while (true) {
    try {
      await createServer(port);
      console.log(`Expense tracker backend listening on http://localhost:${port}`);
      break;
    } catch (error) {
      if (error.code === "EADDRINUSE") {
        console.warn(`Port ${port} is in use. Trying port ${port + 1}...`);
        port += 1;
        continue;
      }
      console.error("Backend failed to start:", error);
      process.exit(1);
    }
  }
}

startServer();
