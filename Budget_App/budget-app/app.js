// ============================================================
// RUPEETRACK - BUDGET MANAGER  |  app.js
// ============================================================

// ===== STATE =====
let DB = {
  transactions: [],
  accounts: [],
  categories: [],
  budgets: [],
  recurring: [],
  catRules: [],
  settings: { pin: null, pinEnabled: false, theme: 'dark', notifications: false },
  version: 2
};

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let budgetMonth = new Date().getMonth();
let budgetYear = new Date().getFullYear();
let currentTxnType = 'expense';
let importedRows = [];
let pendingImport = [];
let donutChartInst = null;
let trendChartInst = null;
let catChartInst = null;
let barChartInst = null;

const CATEGORY_ICONS = {
  'Food & Dining': '🍽️', 'Transport': '🚗', 'Shopping': '🛍️',
  'Utilities & Bills': '⚡', 'Health & Medical': '💊', 'Entertainment': '🎬',
  'Education': '📚', 'Rent & Housing': '🏠', 'Salary': '💼',
  'Freelance Income': '💻', 'Investment Returns': '📈',
  'Transfer': '🔄', 'Other': '📦'
};
const CATEGORY_COLORS = [
  '#6c63ff','#22d09e','#ff5e7d','#f59e0b','#60a5fa',
  '#a78bfa','#34d399','#fb923c','#f472b6','#38bdf8',
  '#84cc16','#e879f9','#2dd4bf','#facc15','#f87171'
];

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  loadDB();
  applyTheme();
  const today = new Date();
  document.getElementById('txnDate').valueAsDate = today;
  document.getElementById('recStartDate').valueAsDate = today;
  checkPinOnLoad();
  processRecurring();
  checkBudgetNotifications();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

// ===== PERSISTENCE =====
function saveDB() {
  try { localStorage.setItem('rupeetrack_db', JSON.stringify(DB)); } catch(e) {}
}
function loadDB() {
  try {
    const raw = localStorage.getItem('rupeetrack_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      DB = { ...DB, ...parsed };
    }
  } catch(e) {}
  if (!DB.categories.length) initDefaultData();
  if (!DB.accounts.length) initDefaultAccounts();
}
function initDefaultData() {
  DB.categories = [
    { id: uid(), name: 'Food & Dining', type: 'expense' },
    { id: uid(), name: 'Transport', type: 'expense' },
    { id: uid(), name: 'Shopping', type: 'expense' },
    { id: uid(), name: 'Utilities & Bills', type: 'expense' },
    { id: uid(), name: 'Health & Medical', type: 'expense' },
    { id: uid(), name: 'Entertainment', type: 'expense' },
    { id: uid(), name: 'Salary', type: 'income' },
    { id: uid(), name: 'Other', type: 'expense' },
  ];
  saveDB();
}
function initDefaultAccounts() {
  DB.accounts = [
    { id: uid(), name: 'Cash', type: 'cash', balance: 0 },
    { id: uid(), name: 'Bank Account', type: 'bank', balance: 0 },
  ];
  saveDB();
}

// ===== PIN =====
let pinBuffer = '';
let pinMode = 'verify'; // 'verify' | 'set'

function checkPinOnLoad() {
  if (DB.settings.pinEnabled && DB.settings.pin) {
    pinMode = 'verify';
    document.getElementById('pinSubtitle').textContent = 'Enter your PIN';
    document.getElementById('pinScreen').classList.remove('hidden');
  } else {
    document.getElementById('pinScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderAll();
  }
}
function pinInput(d) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += d;
  updatePinDots();
  if (pinBuffer.length === 4 && pinMode === 'verify') setTimeout(pinSubmit, 100);
}
function pinClear() { pinBuffer = pinBuffer.slice(0, -1); updatePinDots(); }
function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    document.getElementById('dot' + i).classList.toggle('filled', i < pinBuffer.length);
  }
}
function pinSubmit() {
  if (pinMode === 'verify') {
    if (pinBuffer === DB.settings.pin) {
      document.getElementById('pinScreen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      renderAll();
    } else {
      document.getElementById('pinSubtitle').textContent = 'Wrong PIN. Try again.';
      document.getElementById('pinSubtitle').style.color = 'var(--expense)';
      pinBuffer = ''; updatePinDots();
      setTimeout(() => {
        document.getElementById('pinSubtitle').textContent = 'Enter your PIN';
        document.getElementById('pinSubtitle').style.color = '';
      }, 1500);
    }
  }
}
function togglePin() {
  const cb = document.getElementById('pinToggle');
  if (cb.checked) {
    document.getElementById('pinSetupRow').classList.remove('hidden');
  } else {
    DB.settings.pinEnabled = false;
    DB.settings.pin = null;
    document.getElementById('pinSetupRow').classList.add('hidden');
    saveDB(); showToast('PIN lock disabled');
  }
}
function savePin() {
  const p = document.getElementById('newPin').value;
  if (!/^\d{4}$/.test(p)) { showToast('Please enter a 4-digit PIN'); return; }
  DB.settings.pin = p;
  DB.settings.pinEnabled = true;
  saveDB(); showToast('PIN saved ✓');
  document.getElementById('pinSetupRow').classList.add('hidden');
}

// ===== THEME =====
function applyTheme() {
  document.body.setAttribute('data-theme', DB.settings.theme || 'dark');
  document.getElementById('themeBtn').textContent = DB.settings.theme === 'dark' ? '🌙' : '☀️';
}
function toggleTheme() {
  DB.settings.theme = DB.settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(); saveDB();
}

// ===== TABS =====
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'transactions') { populateCategoryFilters(); renderTransactions(); }
  if (name === 'budget') renderBudget();
  if (name === 'reports') renderReports();
}

// ===== RENDER ALL =====
function renderAll() {
  renderDashboard();
  populateCategoryFilters();
  populateSettingsCategories();
  loadSettingsValues();
}

// ===== DASHBOARD =====
function renderDashboard() {
  const label = new Date(currentYear, currentMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  document.getElementById('dashMonthLabel').textContent = label;
  const txns = getMonthTxns(currentMonth, currentYear);
  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  document.getElementById('dashIncome').textContent = fmt(income);
  document.getElementById('dashExpense').textContent = fmt(expense);
  document.getElementById('dashBalance').textContent = fmt(balance);
  const pct = income > 0 ? Math.min(100, (income - expense) / income * 100) : 0;
  document.getElementById('balanceBarFill').style.width = pct + '%';

  // Accounts
  const row = document.getElementById('accountsRow');
  row.innerHTML = DB.accounts.map(a => `
    <div class="account-card">
      <div class="acc-type-icon">${accIcon(a.type)}</div>
      <div class="acc-name">${a.name}</div>
      <div class="acc-balance">${fmt(a.balance)}</div>
    </div>
  `).join('');

  // Budget alerts
  renderBudgetAlerts(txns);

  // Recent
  const recent = [...txns].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  document.getElementById('recentTxnList').innerHTML = recent.length
    ? recent.map(txnCard).join('') : '<p style="color:var(--text3);text-align:center;padding:20px 0;font-size:14px">No transactions this month</p>';

  // Donut
  renderDonut(txns);
}
function changeMonth(d) {
  currentMonth += d;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderDashboard();
}
function renderBudgetAlerts(txns) {
  const sec = document.getElementById('budgetAlertsSection');
  const list = document.getElementById('budgetAlertsList');
  const alerts = [];
  DB.budgets.filter(b => b.month === currentMonth && b.year === currentYear).forEach(b => {
    const spent = txns.filter(t => t.type === 'expense' && t.category === b.category)
      .reduce((s, t) => s + t.amount, 0);
    const pct = (spent / b.limit) * 100;
    if (pct >= 80) alerts.push({ ...b, spent, pct });
  });
  if (alerts.length) {
    sec.classList.remove('hidden');
    list.innerHTML = alerts.map(a => `
      <div class="alert-card">
        <span>${getCatIcon(a.category)}</span>
        <div>
          <div class="alert-text">${a.category}</div>
          <div class="alert-pct">${fmt(a.spent)} / ${fmt(a.limit)} (${Math.round(a.pct)}%)</div>
        </div>
      </div>`).join('');
  } else sec.classList.add('hidden');
}
function renderDonut(txns) {
  const expTxns = txns.filter(t => t.type === 'expense');
  const catMap = {};
  expTxns.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const entries = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
  const labels = entries.map(e => e[0]);
  const data = entries.map(e => e[1]);
  const colors = entries.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]);
  const ctx = document.getElementById('donutChart').getContext('2d');
  if (donutChartInst) donutChartInst.destroy();
  if (!data.length) { document.getElementById('donutLegend').innerHTML = '<p style="color:var(--text3);font-size:13px;text-align:center">No expense data</p>'; return; }
  donutChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
    options: {
      responsive: true, cutout: '65%',
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` }
      }}
    }
  });
  document.getElementById('donutLegend').innerHTML = entries.map((e, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span>${e[0]}: ${fmt(e[1])}</span>
    </div>`).join('');
}

// ===== TRANSACTIONS =====
function renderTransactions() {
  const search = (document.getElementById('txnSearch').value || '').toLowerCase();
  const catFilter = document.getElementById('txnFilterCat').value;
  const typeFilter = document.getElementById('txnFilterType').value;
  let txns = [...DB.transactions].filter(t => {
    const matchSearch = !search || t.description.toLowerCase().includes(search) || (t.note || '').toLowerCase().includes(search);
    const matchCat = !catFilter || t.category === catFilter;
    const matchType = !typeFilter || t.type === typeFilter;
    return matchSearch && matchCat && matchType;
  }).sort((a,b) => new Date(b.date) - new Date(a.date));

  if (!txns.length) {
    document.getElementById('txnList').innerHTML = '<p style="color:var(--text3);text-align:center;padding:40px 0;font-size:14px">No transactions found</p>';
    return;
  }
  // Group by date
  const groups = {};
  txns.forEach(t => {
    const d = t.date;
    if (!groups[d]) groups[d] = [];
    groups[d].push(t);
  });
  let html = '';
  Object.keys(groups).sort((a,b) => new Date(b)-new Date(a)).forEach(date => {
    html += `<div class="txn-date-group">${formatDate(date)}</div>`;
    html += groups[date].map(txnCard).join('');
  });
  document.getElementById('txnList').innerHTML = html;
}
function txnCard(t) {
  const icon = getCatIcon(t.category);
  const colorStyle = t.type === 'expense' ? 'background:rgba(255,94,125,0.1)' :
    t.type === 'income' ? 'background:rgba(34,208,158,0.1)' : 'background:rgba(96,165,250,0.1)';
  const sign = t.type === 'income' ? '+' : t.type === 'transfer' ? '⇄' : '-';
  return `<div class="txn-item" onclick="openTxnDetail('${t.id}')">
    <div class="txn-cat-icon" style="${colorStyle}">${icon}</div>
    <div class="txn-info">
      <div class="txn-desc">${t.description}</div>
      <div class="txn-meta">${t.category} · ${getAccountName(t.accountId)}</div>
    </div>
    <div class="txn-amount ${t.type}">${sign}${fmt(t.amount)}</div>
  </div>`;
}
function populateCategoryFilters() {
  const sel = document.getElementById('txnFilterCat');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All Categories</option>' +
    DB.categories.map(c => `<option value="${c.name}" ${c.name===cur?'selected':''}>${c.name}</option>`).join('');
}
function openTxnDetail(id) {
  const t = DB.transactions.find(x => x.id === id);
  if (!t) return;
  const acc = DB.accounts.find(a => a.id === t.accountId);
  document.getElementById('txnDetailBody').innerHTML = `
    <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value" style="color:var(--${t.type})">${t.type.toUpperCase()}</span></div>
    <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">${fmt(t.amount)}</span></div>
    <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${t.description}</span></div>
    <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${t.category}</span></div>
    <div class="detail-row"><span class="detail-label">Account</span><span class="detail-value">${acc ? acc.name : '-'}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formatDate(t.date)}</span></div>
    ${t.note ? `<div class="detail-row"><span class="detail-label">Note</span><span class="detail-value">${t.note}</span></div>` : ''}
    <div class="detail-actions">
      <button class="btn-delete" onclick="deleteTxn('${t.id}')">🗑 Delete</button>
    </div>`;
  openModal('txnDetailModal');
}
function deleteTxn(id) {
  const t = DB.transactions.find(x => x.id === id);
  if (!t) return;
  reverseAccountBalance(t);
  DB.transactions = DB.transactions.filter(x => x.id !== id);
  saveDB(); closeModal('txnDetailModal');
  renderAll(); showToast('Transaction deleted');
}

// ===== ADD TRANSACTION =====
function setTxnType(type, btn) {
  currentTxnType = type;
  document.querySelectorAll('#addTxnModal .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  populateTxnCategorySelect();
  document.getElementById('txnTransferToRow').classList.toggle('hidden', type !== 'transfer');
}
function populateTxnCategorySelect() {
  const sel = document.getElementById('txnCategory');
  const cats = currentTxnType === 'transfer'
    ? [{ name: 'Transfer' }]
    : DB.categories.filter(c => c.type === currentTxnType || c.type === 'both');
  sel.innerHTML = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}
function populateAccountSelects() {
  const opts = DB.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  document.getElementById('txnAccount').innerHTML = opts;
  document.getElementById('txnAccountTo').innerHTML = opts;
  document.getElementById('recAccount').innerHTML = opts;
}
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'addTxnModal') {
    populateTxnCategorySelect();
    populateAccountSelects();
    document.getElementById('txnDate').valueAsDate = new Date();
  }
  if (id === 'addBudgetModal') populateBudgetCatSelect();
  if (id === 'addRecurringModal') populateRecurringSelects();
  if (id === 'settingsModal') loadSettingsValues();
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function addTransaction() {
  const amount = parseFloat(document.getElementById('txnAmount').value);
  const desc = document.getElementById('txnDesc').value.trim();
  const cat = document.getElementById('txnCategory').value;
  const accId = document.getElementById('txnAccount').value;
  const date = document.getElementById('txnDate').value;
  const note = document.getElementById('txnNote').value.trim();
  if (!amount || amount <= 0) { showToast('Please enter a valid amount'); return; }
  if (!desc) { showToast('Please enter a description'); return; }
  if (!accId) { showToast('Please select an account'); return; }
  if (!date) { showToast('Please select a date'); return; }

  const txn = { id: uid(), type: currentTxnType, amount, description: desc, category: cat, accountId: accId, date, note, createdAt: Date.now() };
  if (currentTxnType === 'transfer') txn.accountToId = document.getElementById('txnAccountTo').value;
  DB.transactions.push(txn);
  applyAccountBalance(txn);
  saveDB();
  closeModal('addTxnModal');
  resetTxnForm();
  renderAll();
  checkBudgetNotifications();
  showToast('Transaction added ✓');
}
function resetTxnForm() {
  ['txnAmount','txnDesc','txnNote'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('txnDate').valueAsDate = new Date();
  currentTxnType = 'expense';
  document.querySelectorAll('#addTxnModal .pill').forEach((p,i) => p.classList.toggle('active', i===0));
  populateTxnCategorySelect();
}
function applyAccountBalance(t) {
  const acc = DB.accounts.find(a => a.id === t.accountId);
  if (!acc) return;
  if (t.type === 'income') acc.balance += t.amount;
  if (t.type === 'expense') acc.balance -= t.amount;
  if (t.type === 'transfer') {
    acc.balance -= t.amount;
    const toAcc = DB.accounts.find(a => a.id === t.accountToId);
    if (toAcc) toAcc.balance += t.amount;
  }
}
function reverseAccountBalance(t) {
  const acc = DB.accounts.find(a => a.id === t.accountId);
  if (!acc) return;
  if (t.type === 'income') acc.balance -= t.amount;
  if (t.type === 'expense') acc.balance += t.amount;
  if (t.type === 'transfer') {
    acc.balance += t.amount;
    const toAcc = DB.accounts.find(a => a.id === t.accountToId);
    if (toAcc) toAcc.balance -= t.amount;
  }
}

// ===== ACCOUNTS =====
function addAccount() {
  const name = document.getElementById('accName').value.trim();
  const type = document.getElementById('accType').value;
  const balance = parseFloat(document.getElementById('accBalance').value) || 0;
  if (!name) { showToast('Please enter account name'); return; }
  DB.accounts.push({ id: uid(), name, type, balance });
  saveDB(); closeModal('addAccountModal');
  renderAll(); showToast('Account added ✓');
}

// ===== CATEGORIES =====
function addCategory() {
  const name = document.getElementById('newCatName').value.trim();
  const type = document.getElementById('newCatType').value;
  if (!name) { showToast('Enter category name'); return; }
  if (DB.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) { showToast('Category already exists'); return; }
  DB.categories.push({ id: uid(), name, type });
  saveDB(); document.getElementById('newCatName').value = '';
  populateSettingsCategories(); populateCategoryFilters(); showToast('Category added ✓');
}
function deleteCategory(id) {
  DB.categories = DB.categories.filter(c => c.id !== id);
  saveDB(); populateSettingsCategories(); showToast('Category removed');
}
function populateSettingsCategories() {
  document.getElementById('categoriesList').innerHTML = DB.categories.map(c => `
    <div class="cat-chip">
      <span>${getCatIcon(c.name)}</span>
      <span>${c.name}</span>
      <span style="font-size:11px;color:var(--text3);margin-left:4px">(${c.type})</span>
      <span class="cat-chip-del" onclick="deleteCategory('${c.id}')">✕</span>
    </div>`).join('');
}

// ===== BUDGET =====
function populateBudgetCatSelect() {
  const sel = document.getElementById('budgetCategory');
  sel.innerHTML = DB.categories.filter(c => c.type === 'expense')
    .map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}
function addBudget() {
  const cat = document.getElementById('budgetCategory').value;
  const limit = parseFloat(document.getElementById('budgetLimit').value);
  if (!limit || limit <= 0) { showToast('Enter a valid budget limit'); return; }
  const existing = DB.budgets.findIndex(b => b.category === cat && b.month === budgetMonth && b.year === budgetYear);
  if (existing > -1) DB.budgets[existing].limit = limit;
  else DB.budgets.push({ id: uid(), category: cat, limit, month: budgetMonth, year: budgetYear });
  saveDB(); closeModal('addBudgetModal');
  renderBudget(); showToast('Budget set ✓');
}
function renderBudget() {
  const label = new Date(budgetYear, budgetMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  document.getElementById('budgetMonthLabel').textContent = label;
  const txns = getMonthTxns(budgetMonth, budgetYear);
  const budgets = DB.budgets.filter(b => b.month === budgetMonth && b.year === budgetYear);
  const list = document.getElementById('budgetList');
  if (!budgets.length) {
    list.innerHTML = '<p style="color:var(--text3);text-align:center;padding:30px 0;font-size:14px">No budgets set for this month</p>';
  } else {
    list.innerHTML = budgets.map(b => {
      const spent = txns.filter(t => t.type === 'expense' && t.category === b.category).reduce((s,t) => s + t.amount, 0);
      const pct = Math.min(100, (spent / b.limit) * 100);
      const cls = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
      return `<div class="budget-item">
        <div class="budget-item-header">
          <div class="budget-cat">${getCatIcon(b.category)} ${b.category}</div>
          <div class="budget-amounts">${fmt(spent)} / <strong>${fmt(b.limit)}</strong></div>
        </div>
        <div class="budget-progress"><div class="budget-fill ${cls}" style="width:${pct}%"></div></div>
        <div class="budget-pct">${Math.round(pct)}% used</div>
      </div>`;
    }).join('');
  }
  renderRecurringList();
}
function changeBudgetMonth(d) {
  budgetMonth += d;
  if (budgetMonth < 0) { budgetMonth = 11; budgetYear--; }
  if (budgetMonth > 11) { budgetMonth = 0; budgetYear++; }
  renderBudget();
}

// ===== RECURRING =====
function populateRecurringSelects() {
  const cats = DB.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  document.getElementById('recCategory').innerHTML = cats;
  const accs = DB.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  document.getElementById('recAccount').innerHTML = accs;
}
function addRecurring() {
  const desc = document.getElementById('recDesc').value.trim();
  const amount = parseFloat(document.getElementById('recAmount').value);
  const type = document.getElementById('recType').value;
  const cat = document.getElementById('recCategory').value;
  const accId = document.getElementById('recAccount').value;
  const freq = document.getElementById('recFrequency').value;
  const startDate = document.getElementById('recStartDate').value;
  if (!desc || !amount || !startDate) { showToast('Fill all fields'); return; }
  DB.recurring.push({ id: uid(), description: desc, amount, type, category: cat, accountId: accId, frequency: freq, startDate, lastProcessed: null });
  saveDB(); closeModal('addRecurringModal');
  renderRecurringList(); showToast('Recurring added ✓');
}
function renderRecurringList() {
  const el = document.getElementById('recurringList');
  if (!DB.recurring.length) {
    el.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px 0;font-size:14px">No recurring transactions</p>';
    return;
  }
  el.innerHTML = DB.recurring.map(r => `
    <div class="recurring-item">
      <div class="txn-cat-icon" style="background:rgba(108,99,255,0.1)">${getCatIcon(r.category)}</div>
      <div class="rec-info">
        <div class="rec-desc">${r.description}</div>
        <div class="rec-meta">${r.frequency} · ${r.category}</div>
      </div>
      <div class="rec-amount" style="color:var(--${r.type})">${r.type==='income'?'+':'-'}${fmt(r.amount)}</div>
      <button class="rec-del" onclick="deleteRecurring('${r.id}')">🗑</button>
    </div>`).join('');
}
function deleteRecurring(id) {
  DB.recurring = DB.recurring.filter(r => r.id !== id);
  saveDB(); renderRecurringList(); showToast('Removed');
}
function processRecurring() {
  const today = new Date(); today.setHours(0,0,0,0);
  DB.recurring.forEach(r => {
    const start = new Date(r.startDate);
    let next = r.lastProcessed ? new Date(r.lastProcessed) : new Date(r.startDate);
    next.setHours(0,0,0,0);
    // advance next date past lastProcessed
    if (r.lastProcessed) {
      if (r.frequency === 'daily') next.setDate(next.getDate() + 1);
      else if (r.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (r.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
      else if (r.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
    }
    while (next <= today && next >= start) {
      const dateStr = next.toISOString().split('T')[0];
      if (!DB.transactions.find(t => t.recurringId === r.id && t.date === dateStr)) {
        const txn = { id: uid(), type: r.type, amount: r.amount, description: r.description, category: r.category, accountId: r.accountId, date: dateStr, note: 'Auto (recurring)', recurringId: r.id, createdAt: Date.now() };
        DB.transactions.push(txn);
        applyAccountBalance(txn);
      }
      r.lastProcessed = dateStr;
      if (r.frequency === 'daily') next.setDate(next.getDate() + 1);
      else if (r.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (r.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
      else if (r.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
    }
  });
  saveDB();
}

// ===== REPORTS =====
function renderReports() {
  renderTrendChart();
  populateReportCatSelect();
  renderCategoryChart();
  renderBarChart();
}
function renderTrendChart() {
  const months = getLast6Months();
  const income = months.map(m => getMonthTxns(m.month, m.year).filter(t => t.type==='income').reduce((s,t)=>s+t.amount,0));
  const expense = months.map(m => getMonthTxns(m.month, m.year).filter(t => t.type==='expense').reduce((s,t)=>s+t.amount,0));
  const labels = months.map(m => new Date(m.year, m.month).toLocaleString('en-IN',{month:'short'}));
  const ctx = document.getElementById('trendChart').getContext('2d');
  if (trendChartInst) trendChartInst.destroy();
  trendChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Income', data: income, borderColor: '#22d09e', backgroundColor: 'rgba(34,208,158,0.1)', tension: 0.4, fill: true },
        { label: 'Expense', data: expense, borderColor: '#ff5e7d', backgroundColor: 'rgba(255,94,125,0.1)', tension: 0.4, fill: true }
      ]
    },
    options: { responsive: true, plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text2') } } }, scales: { x: { ticks: { color: 'var(--text2)' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: 'var(--text2)', callback: v => '₹'+shortNum(v) }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
  });
}
function populateReportCatSelect() {
  const sel = document.getElementById('reportCatSelect');
  sel.innerHTML = DB.categories.filter(c => c.type==='expense').map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}
function renderCategoryChart() {
  const cat = document.getElementById('reportCatSelect').value;
  const months = getLast6Months();
  const data = months.map(m => getMonthTxns(m.month, m.year).filter(t => t.type==='expense' && t.category===cat).reduce((s,t)=>s+t.amount,0));
  const labels = months.map(m => new Date(m.year, m.month).toLocaleString('en-IN',{month:'short', year:'2-digit'}));
  const ctx = document.getElementById('catChart').getContext('2d');
  if (catChartInst) catChartInst.destroy();
  catChartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: cat, data, backgroundColor: '#6c63ff', borderRadius: 8 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: 'var(--text2)' }, grid: { display: false } }, y: { ticks: { color: 'var(--text2)', callback: v => '₹'+shortNum(v) }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
  });
}
function renderBarChart() {
  const months = getLast6Months();
  const income = months.map(m => getMonthTxns(m.month, m.year).filter(t => t.type==='income').reduce((s,t)=>s+t.amount,0));
  const expense = months.map(m => getMonthTxns(m.month, m.year).filter(t => t.type==='expense').reduce((s,t)=>s+t.amount,0));
  const labels = months.map(m => new Date(m.year, m.month).toLocaleString('en-IN',{month:'short'}));
  const ctx = document.getElementById('barChart').getContext('2d');
  if (barChartInst) barChartInst.destroy();
  barChartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Income', data: income, backgroundColor: 'rgba(34,208,158,0.7)', borderRadius: 6 },
      { label: 'Expense', data: expense, backgroundColor: 'rgba(255,94,125,0.7)', borderRadius: 6 }
    ]},
    options: { responsive: true, plugins: { legend: { labels: { color: 'var(--text2)' } } }, scales: { x: { ticks: { color: 'var(--text2)' }, grid: { display: false } }, y: { ticks: { color: 'var(--text2)', callback: v => '₹'+shortNum(v) }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
  });
}

// ===== IMPORT =====
let xlsColumns = [];
let xlsData = [];
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const data = new Uint8Array(ev.target.result);
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!json.length) { showToast('Empty file'); return; }
    xlsColumns = json[0].map(String);
    xlsData = json.slice(1).filter(row => row.some(c => c !== ''));
    renderColumnMapper();
    document.getElementById('columnMapSection').classList.remove('hidden');
  };
  reader.readAsArrayBuffer(file);
}
function renderColumnMapper() {
  const fields = [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
    { key: 'debit', label: 'Debit (optional)' },
    { key: 'credit', label: 'Credit (optional)' },
    { key: 'balance', label: 'Balance (optional)' }
  ];
  const opts = ['(skip)', ...xlsColumns].map(c => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('columnMapFields').innerHTML = fields.map(f => `
    <div class="map-row">
      <label>${f.label}</label>
      <select class="form-input" id="map_${f.key}">${opts}</select>
    </div>`).join('');
  // Auto-match
  fields.forEach(f => {
    const sel = document.getElementById('map_' + f.key);
    const match = xlsColumns.find(c => c.toLowerCase().includes(f.key));
    if (match) sel.value = match;
  });
  // Init rules
  document.getElementById('catRulesList').innerHTML = '';
  if (!DB.catRules.length) {
    DB.categories.filter(c => c.type==='expense').forEach(c => {
      DB.catRules.push({ id: uid(), keyword: '', category: c.name });
    });
  }
  renderCatRules();
}
function renderCatRules() {
  const catOpts = DB.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  document.getElementById('catRulesList').innerHTML = DB.catRules.map(r => `
    <div class="rule-row" id="rule_${r.id}">
      <input type="text" class="form-input" placeholder="Keyword..." value="${r.keyword}" oninput="updateRule('${r.id}','keyword',this.value)" />
      <select class="form-input" onchange="updateRule('${r.id}','category',this.value)">${catOpts.replace(`value="${r.category}"`,`value="${r.category}" selected`)}</select>
      <button class="rule-del" onclick="deleteRule('${r.id}')">✕</button>
    </div>`).join('');
}
function addCatRule() {
  DB.catRules.push({ id: uid(), keyword: '', category: DB.categories[0]?.name || 'Other' });
  renderCatRules();
}
function updateRule(id, field, val) {
  const r = DB.catRules.find(r => r.id === id);
  if (r) { r[field] = val; saveDB(); }
}
function deleteRule(id) {
  DB.catRules = DB.catRules.filter(r => r.id !== id);
  saveDB(); renderCatRules();
}
function getCatForDescription(desc) {
  const d = desc.toLowerCase();
  for (const rule of DB.catRules) {
    if (rule.keyword && d.includes(rule.keyword.toLowerCase())) return rule.category;
  }
  return 'Other';
}
function importTransactions() {
  const getCol = key => {
    const sel = document.getElementById('map_' + key);
    return sel ? sel.value : '(skip)';
  };
  const dateCol = getCol('date');
  const descCol = getCol('description');
  const amtCol = getCol('amount');
  const debitCol = getCol('debit');
  const creditCol = getCol('credit');
  if (dateCol === '(skip)' || descCol === '(skip)') { showToast('Date and Description columns are required'); return; }
  const getIdx = col => xlsColumns.indexOf(col);
  const dateIdx = getIdx(dateCol), descIdx = getIdx(descCol);
  const amtIdx = getIdx(amtCol), debitIdx = getIdx(debitCol), creditIdx = getIdx(creditCol);
  const defaultAccId = DB.accounts[0]?.id;
  pendingImport = [];
  xlsData.forEach(row => {
    const rawDate = row[dateIdx];
    const desc = String(row[descIdx] || '').trim();
    if (!desc) return;
    let parsedDate = parseExcelDate(rawDate);
    if (!parsedDate) return;
    let amount = 0, type = 'expense';
    if (debitIdx > -1 && creditIdx > -1) {
      const debit = parseFloat(row[debitIdx]) || 0;
      const credit = parseFloat(row[creditIdx]) || 0;
      if (credit > 0) { amount = credit; type = 'income'; }
      else if (debit > 0) { amount = debit; type = 'expense'; }
      else return;
    } else if (amtIdx > -1) {
      const raw = parseFloat(String(row[amtIdx]).replace(/[^0-9.-]/g,''));
      amount = Math.abs(raw);
      type = raw < 0 ? 'expense' : 'income';
    } else return;
    const cat = getCatForDescription(desc);
    pendingImport.push({ id: uid(), type, amount, description: desc, category: cat, accountId: defaultAccId, date: parsedDate, note: 'Imported', createdAt: Date.now() });
  });
  if (!pendingImport.length) { showToast('No valid rows found'); return; }
  document.getElementById('importPreviewTitle').textContent = `Preview: ${pendingImport.length} transactions`;
  document.getElementById('importPreviewList').innerHTML = pendingImport.slice(0,10).map(t => `
    <div class="preview-item">
      <strong>${t.description}</strong><br/>
      ${t.date} · ${t.category} · <span style="color:var(--${t.type})">${t.type==='income'?'+':'-'}${fmt(t.amount)}</span>
    </div>`).join('') + (pendingImport.length > 10 ? `<div class="preview-item" style="text-align:center">...and ${pendingImport.length-10} more</div>` : '');
  document.getElementById('columnMapSection').classList.add('hidden');
  document.getElementById('importPreview').classList.remove('hidden');
}
function confirmImport() {
  let added = 0;
  pendingImport.forEach(t => {
    if (!DB.transactions.find(x => x.date === t.date && x.description === t.description && x.amount === t.amount)) {
      DB.transactions.push(t);
      added++;
    }
  });
  saveDB(); closeModal('importModal');
  document.getElementById('importPreview').classList.add('hidden');
  document.getElementById('columnMapSection').classList.add('hidden');
  renderAll(); showToast(`${added} transactions imported ✓`);
}
function parseExcelDate(raw) {
  if (!raw) return null;
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = String(raw).trim();
  const fmts = [
    /^(\d{4})-(\d{2})-(\d{2})/, /^(\d{2})\/(\d{2})\/(\d{4})/,
    /^(\d{2})-(\d{2})-(\d{4})/, /^(\d{2})\.(\d{2})\.(\d{4})/
  ];
  for (const re of fmts) {
    const m = s.match(re);
    if (m) {
      if (re === fmts[0]) return `${m[1]}-${m[2]}-${m[3]}`;
      return `${m[3]}-${m[2]}-${m[1]}`;
    }
  }
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  return null;
}

// ===== EXPORT =====
function exportCSV() {
  const headers = ['Date','Type','Amount','Description','Category','Account','Note'];
  const rows = DB.transactions.map(t => [
    t.date, t.type, t.amount, `"${t.description}"`, t.category, getAccountName(t.accountId), `"${t.note||''}"`
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  downloadFile('rupeetrack_export.csv', csv, 'text/csv');
  showToast('CSV exported ✓');
}
function exportJSON() {
  downloadFile('rupeetrack_backup.json', JSON.stringify(DB, null, 2), 'application/json');
  showToast('JSON exported ✓');
}
function downloadFile(name, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = name; a.click();
}
function backupDrive() {
  showToast('Opening Google Drive...');
  const json = JSON.stringify(DB, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rupeetrack_backup.json'; a.click();
  setTimeout(() => { window.open('https://drive.google.com/drive/my-drive', '_blank'); }, 500);
}

// ===== NOTIFICATIONS =====
function toggleNotifications() {
  const cb = document.getElementById('notifToggle');
  if (cb.checked) {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => {
        DB.settings.notifications = p === 'granted';
        saveDB();
        showToast(p === 'granted' ? 'Notifications enabled ✓' : 'Permission denied');
        if (p !== 'granted') cb.checked = false;
      });
    }
  } else {
    DB.settings.notifications = false; saveDB();
  }
}
function checkBudgetNotifications() {
  if (!DB.settings.notifications) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const txns = getMonthTxns(currentMonth, currentYear);
  DB.budgets.filter(b => b.month === currentMonth && b.year === currentYear).forEach(b => {
    const spent = txns.filter(t => t.type==='expense' && t.category===b.category).reduce((s,t)=>s+t.amount,0);
    const pct = (spent/b.limit)*100;
    if (pct >= 100) new Notification('RupeeTrack Alert', { body: `${b.category} budget exceeded! Spent ${fmt(spent)} of ${fmt(b.limit)}` });
    else if (pct >= 80) new Notification('RupeeTrack Warning', { body: `${b.category} budget at ${Math.round(pct)}%. ${fmt(b.limit-spent)} remaining.` });
  });
}

// ===== SETTINGS =====
function loadSettingsValues() {
  document.getElementById('pinToggle').checked = DB.settings.pinEnabled;
  document.getElementById('notifToggle').checked = DB.settings.notifications;
  populateSettingsCategories();
}
function confirmClearData() {
  if (confirm('Are you sure? This will delete ALL transactions, accounts, and settings. This cannot be undone.')) {
    localStorage.removeItem('rupeetrack_db');
    location.reload();
  }
}

// ===== HELPERS =====
function uid() { return Math.random().toString(36).substr(2,9) + Date.now().toString(36); }
function fmt(n) { return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function shortNum(n) { if (n >= 1e5) return (n/1e5).toFixed(1)+'L'; if (n >= 1e3) return (n/1e3).toFixed(0)+'K'; return n; }
function formatDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function getMonthTxns(month, year) {
  return DB.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  });
}
function getLast6Months() {
  const res = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    res.push({ month: d.getMonth(), year: d.getFullYear() });
  }
  return res;
}
function getCatIcon(name) { return CATEGORY_ICONS[name] || '📦'; }
function getAccountName(id) { const a = DB.accounts.find(a => a.id === id); return a ? a.name : '-'; }
function accIcon(type) { return { cash: '💵', bank: '🏦', card: '💳', wallet: '👛' }[type] || '💰'; }
function showToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), dur);
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.add('hidden'); });
});
