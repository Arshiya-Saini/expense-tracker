# ExpenseTracker - Quick Start Guide

## 🎉 What's New?

Your expense tracker has been completely redesigned with:
- ✅ Modern color scheme with excellent contrast
- ✅ Budget tracking with smart alerts
- ✅ Enhanced charts and analytics
- ✅ Fully responsive mobile design
- ✅ Better UI/UX throughout

## 🚀 Running the Application

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Step 1: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 2: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend will run on `http://localhost:4000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

### Step 3: Open in Browser
Visit `http://localhost:5173` in your web browser

## 📱 Testing the Improvements

### 1. Try the New Color Scheme
- Notice the cleaner, professional look
- Better text contrast and visibility
- Modern gradient buttons

### 2. Test Budget Alerts
1. Create some expenses
2. Set a monthly budget goal in the sidebar (e.g., $500)
3. Add expenses totaling ~$400
4. See the yellow warning alert appear
5. Add more to exceed $500
6. Red alert appears with "Budget exceeded!" message

### 3. Check Responsive Design
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Try different screen sizes:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
4. Notice how layout adapts perfectly

### 4. Test Features
- ✅ Add income/expense transactions
- ✅ Search transactions by description
- ✅ Filter by category
- ✅ View charts by time range (Monthly, Weekly, Yearly)
- ✅ Export data to Excel
- ✅ Delete transactions

## 📊 Dashboard Overview

### Statistics Cards
Four main cards showing:
1. **Income** - Total money earned
2. **Expense** - Total money spent
3. **Savings** - Income minus Expenses
4. **Goal Progress** - Budget tracking percentage

### Features Section
- **New Transaction Form** - Quick add transactions
- **Monthly Goal** - Set budget with visual progress
- **Budget Alerts** - Smart notifications
- **Transactions List** - All your transactions with search/filter
- **Charts** - Visual breakdown by category

## 🎯 Key Features

### Budget Tracking
```
Set monthly goal → See progress bar → Get alerts
80% = Yellow warning
100%+ = Red alert with exceeded amount
```

### Transaction Management
```
Add → Search → Filter → Export → Delete
```

### Analytics
```
Bar Chart: Expenses by category
Pie Chart: Income vs Expense balance
```

## ⚙️ Configuration

### Environment Variables

**Frontend (.env if needed):**
```
VITE_API_BASE=http://localhost:4000/api
```

**Backend (already configured):**
```
PORT=4000
```

## 📝 Sample Test Data

Try these transactions to see the features in action:

**Income:**
- Salary: $3000 (Salary category)
- Freelance Project: $500 (Freelance category)

**Expenses:**
- Groceries: $200 (Food)
- Gas: $50 (Transport)
- Netflix: $15 (Entertainment)
- Rent: $1000 (Housing)

**Then set goal to $1500** to see alerts in action.

## 🔍 Troubleshooting

### Frontend won't load?
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run dev
```

### Backend connection error?
```bash
# Make sure backend is running
cd backend
npm run dev
# Check if port 4000 is available
```

### Styles not applying?
```bash
# Tailwind CSS might not be compiled
cd frontend
npm run dev  # This rebuilds CSS
```

### Data not persisting?
- Check that `backend/data/store.json` exists
- Make sure backend has write permissions
- Try creating a test transaction

## 💾 Data Storage

Your data is stored in:
- **Location:** `backend/data/store.json`
- **Format:** JSON file (human-readable)
- **Backup:** Copy this file to backup your data
- **No MongoDB needed:** Everything works with JSON

## 📚 Project Structure

```
ExpenseTracker/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── MainDashboard.jsx (Main app)
│   │   │   └── UserProfile.jsx
│   │   ├── components/
│   │   ├── context/ (Auth context)
│   │   ├── assets/
│   │   │   └── color.jsx (Color palette)
│   │   ├── index.css (Styling)
│   │   └── App.jsx
│   └── package.json
├── backend/
│   ├── server.js
│   ├── controllers/ (API logic)
│   ├── models/ (Data models)
│   ├── data/
│   │   └── store.json (Your data)
│   └── package.json
├── UI_IMPROVEMENTS.md
└── MONGODB_GUIDE.md
```

## 🆘 Need Help?

### Issues?
1. Check browser console (F12 → Console tab)
2. Check browser network tab (F12 → Network tab)
3. Check backend terminal for error messages

### Backend Issues?
```bash
cd backend
npm run dev  # Should show "Server running on port 4000"
```

### Frontend Issues?
```bash
cd frontend
npm run dev  # Should show Vite dev server URL
```

## 🎨 Customization

### Change Colors
Edit `frontend/src/index.css`:
```css
:root {
  --accent: #3b82f6;    /* Main color */
  --success: #10b981;   /* Income color */
  --danger: #ef4444;    /* Expense color */
}
```

### Change Budget Alert Thresholds
Edit `frontend/src/pages/MainDashboard.jsx`:
```javascript
// Current: alerts at 80%
if (getMonthlyExpense(transactions) >= goal * 0.8)
// Change to: alerts at 75%
if (getMonthlyExpense(transactions) >= goal * 0.75)
```

## 🚀 What's Next?

1. **Use the app** - Start tracking your expenses!
2. **Test on mobile** - See how responsive it is
3. **Set a budget** - Track your spending goals
4. **Export data** - Download your transactions
5. **Plan features** - Think about what you'd like next

## 📖 Documentation

- **UI_IMPROVEMENTS.md** - Detailed UI/UX improvements
- **MONGODB_GUIDE.md** - When/how to migrate to MongoDB (optional)

## 🎊 You're All Set!

Your ExpenseTracker is now:
- ✅ Visually polished
- ✅ Feature-rich
- ✅ Mobile-responsive
- ✅ Production-ready

**Enjoy tracking your finances with style!** 🎉
