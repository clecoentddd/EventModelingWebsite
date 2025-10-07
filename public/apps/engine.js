/* ============================
   Event-Sourced Accounting Engine
   Commands, Events, Business Rules
   ============================ */

/* ============================
   Utilities & Timestamping
   ============================ */
let lastTimestamp = Date.now();

function getNextTimestamp() {
  // ensures strictly increasing timestamps (ms)
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
  return new Date(lastTimestamp).toISOString();
}

/* ============================
   Tiny Pub/Sub
   ============================ */
const bus = {
  subs: {},
  on(event, fn) {
    (this.subs[event] ||= []).push(fn);
  },
  emit(event, data) {
    (this.subs[event] || []).forEach(fn => fn(data));
  }
};

/* ============================
   In-memory store & catalog
   ============================ */
let events = [];
let projection = {};
let currentChangeId = null;

const INCOMES = [
  { code: 101, label: "Salary" },
  { code: 102, label: "Dividends" },
  { code: 103, label: "Freelance" },
  { code: 104, label: "Bonus" },
  { code: 105, label: "Gift" },
  { code: 106, label: "Investment Return" },
  { code: 107, label: "Rent Income" },
  { code: 108, label: "Refund" },
  { code: 109, label: "Interest" },
  { code: 110, label: "Other Income" },
];

const EXPENSES = [
  { code: 201, label: "Rent" },
  { code: 202, label: "Groceries" },
  { code: 203, label: "Utilities" },
  { code: 204, label: "Transportation" },
  { code: 205, label: "Insurance" },
  { code: 206, label: "Entertainment" },
  { code: 207, label: "Healthcare" },
  { code: 208, label: "Education" },
  { code: 209, label: "Taxes" },
  { code: 210, label: "Other Expense" },
];

/* ============================
   Seed data (no timestamps provided - we'll assign)
   ============================ */
const seedEventsData = [
  { type: "ChangeStarted", changeId: "C1001" },
  { type: "IncomeAdded", changeId: "C1001", entryCode: 101, label: "Salary", amount: 2000, startMonth: "01-2025", endMonth: "03-2025" },
  { type: "ExpenseAdded", changeId: "C1001", entryCode: 202, label: "Groceries", amount: 150, startMonth: "01-2025", endMonth: "02-2025" },
  { type: "ChangeValidated", changeId: "C1001" },

  { type: "ChangeStarted", changeId: "C1002" },
  { type: "IncomeAdded", changeId: "C1002", entryCode: 104, label: "Bonus", amount: 500, startMonth: "02-2025", endMonth: "04-2025" },
  { type: "ExpenseAdded", changeId: "C1002", entryCode: 205, label: "Insurance", amount: 100, startMonth: "03-2025", endMonth: "03-2025" },
  { type: "ChangeCancelled", changeId: "C1002" },

  // incomplete change (intentionally open)
  { type: "ChangeStarted", changeId: "C1003" },
  { type: "ExpenseAdded", changeId: "C1003", entryCode: 206, label: "Entertainment", amount: 80, startMonth: "02-2025", endMonth: "04-2025" },
];

/* When initializing, assign timestamps in chronological order */
(function initSeed() {
  let lastChange = null;
  for (const e of seedEventsData) {
    // bump time slightly whenever changeId changes (for clarity)
    if (e.changeId && e.changeId !== lastChange) {
      lastTimestamp += 60000; // jump 1 minute on new change set
      lastChange = e.changeId;
    }
    // if seed already has timestamp, keep it; otherwise generate new
    if (!e.timestamp) e.timestamp = getNextTimestamp();
    events.push({ ...e }); // push as-is (we will always process chronologically)
  }
})();

/* ============================
   Helpers for chronological replay
   ============================ */

function eventsChronological() {
  // returns a copy sorted by ascending timestamp (oldest first)
  return [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function eventsReverseChronological() {
  return [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getLatestGlobalEvent() {
  const ev = eventsReverseChronological()[0];
  return ev || null;
}

function getLastEventForChange(changeId) {
  if (!changeId) return null;
  // find last event for that change by timestamp
  const ev = eventsChronological().filter(e => e.changeId === changeId).pop();
  return ev || null;
}

function getOpenChangeId() {
  // find all changeIds and determine those not ended by validated/cancelled
  const grouped = {};
  for (const e of eventsChronological()) {
    if (!e.changeId) continue;
    grouped[e.changeId] = e; // ends up storing most recent due to chronological iteration
  }
  const open = Object.entries(grouped)
    .filter(([cid, lastEv]) => lastEv.type !== "ChangeValidated" && lastEv.type !== "ChangeCancelled")
    .map(([cid, lastEv]) => ({ changeId: cid, lastEv }));
  if (open.length === 0) return null;
  // return the one with latest timestamp
  open.sort((a, b) => new Date(b.lastEv.timestamp) - new Date(a.lastEv.timestamp));
  return open[0].changeId;
}

/* ============================
   Event API
   ============================ */

function record(event) {
  // If event has its own timestamp, use it (useful for tests); otherwise generate one
  const ev = { ...event };
  if (!ev.timestamp) ev.timestamp = getNextTimestamp();
  events.push(ev);
  rebuildProjection();
  bus.emit("eventRecorded");
  return ev;
}

/* ============================
   Business rule helpers
   ============================ */

function getLastChangeEventType(changeId) {
  // Get the last CHANGE-RELATED event type for a specific change
  // Only looks at: ChangeStarted, ChangeValidated, ChangeCancelled
  // Ignores: IncomeAdded, ExpenseAdded, etc.
  const changeEvents = eventsChronological()
    .filter(e => e.changeId === changeId)
    .filter(e => ["ChangeStarted", "ChangeValidated", "ChangeCancelled"].includes(e.type));
  
  return changeEvents.length > 0 ? changeEvents[changeEvents.length - 1].type : null;
}

function isChangeStarted(changeId) {
  // A change is "started" if its last CHANGE event is ChangeStarted
  const lastChangeEventType = getLastChangeEventType(changeId);
  return lastChangeEventType === "ChangeStarted";
}

function canAddEntry(changeId) {
  // User can add income/expense only if the last CHANGE event is ChangeStarted
  return isChangeStarted(changeId);
}

function canValidateChange(changeId) {
  // User can validate a change only if the last CHANGE event is ChangeStarted
  return isChangeStarted(changeId);
}

function canCancelChange(changeId) {
  // User can cancel a change only if the last CHANGE event is ChangeStarted
  return isChangeStarted(changeId);
}

/* ============================
   Commands: Start / Validate / Cancel
   ============================ */

function startChange() {
  // User can always start a new change
  const newId = "C" + Math.floor(1000 + Math.random() * 9000);
  currentChangeId = newId;
  record({ type: "ChangeStarted", changeId: currentChangeId });
  console.log("Started new change:", currentChangeId);
}

function validateChange() {
  if (!currentChangeId) {
    alert("No active change to validate.");
    return;
  }
  
  // Check if the change can be validated (last CHANGE event must be ChangeStarted)
  if (!canValidateChange(currentChangeId)) {
    const lastChangeEventType = getLastChangeEventType(currentChangeId);
    alert(`Cannot validate change ${currentChangeId}.\nLast CHANGE event for this change is "${lastChangeEventType}".\nYou can only validate a change if its last CHANGE event is "ChangeStarted".`);
    return;
  }
  
  record({ type: "ChangeValidated", changeId: currentChangeId });
  console.log("Validated change:", currentChangeId);
  currentChangeId = null;
}

function cancelChange() {
  if (!currentChangeId) {
    alert("No active change to cancel.");
    return;
  }
  
  // Check if the change can be cancelled (last CHANGE event must be ChangeStarted)
  if (!canCancelChange(currentChangeId)) {
    const lastChangeEventType = getLastChangeEventType(currentChangeId);
    alert(`Cannot cancel change ${currentChangeId}.\nLast CHANGE event for this change is "${lastChangeEventType}".\nYou can only cancel a change if its last CHANGE event is "ChangeStarted".`);
    return;
  }
  
  record({ type: "ChangeCancelled", changeId: currentChangeId });
  console.log("Cancelled change:", currentChangeId);
  currentChangeId = null;
}

/* ============================
   Command: Add Entry - enforces rules
   ============================ */

function addEntry() {
  if (!currentChangeId) {
    alert("Cannot add entry — no active change. Please start a change first.");
    return;
  }

  // Check if the change allows adding entries (last CHANGE event must be ChangeStarted)
  if (!canAddEntry(currentChangeId)) {
    const lastChangeEventType = getLastChangeEventType(currentChangeId);
    alert(`Cannot add entry to change ${currentChangeId}.\nLast CHANGE event for this change is "${lastChangeEventType}".\nYou can only add entries if the change's last CHANGE event is "ChangeStarted".`);
    return;
  }

  // Get form values
  const type = document.getElementById("type").value;
  const code = document.getElementById("entryCode").value;
  const label = getLabelByCode(type, code);
  const amount = Number(document.getElementById("amount").value);
  const startMonthInput = document.getElementById("startMonth").value;
  const endMonthInput = document.getElementById("endMonth").value;

  if (!amount) {
    alert("Enter an amount!");
    return;
  }
  if (!startMonthInput || !endMonthInput) {
    alert("Enter start and end months!");
    return;
  }

  const startMonth = convertMonthFormat(startMonthInput);
  const endMonth = convertMonthFormat(endMonthInput);

  const evType = type === "income" ? "IncomeAdded" : "ExpenseAdded";
  record({ type: evType, changeId: currentChangeId, entryCode: code, label, amount, startMonth, endMonth });
  
  // Clear form fields
  document.getElementById("amount").value = "";
  document.getElementById("startMonth").value = "";
  document.getElementById("endMonth").value = "";
  
  console.log("Added entry to change:", currentChangeId);
}

/* ============================
   Month helpers (input type=month -> record "MM-YYYY")
   ============================ */
function convertMonthFormat(yyyyMm) {
  if (!yyyyMm) return '';
  const [year, month] = yyyyMm.split('-');
  return `${month}-${year}`;
}

function isValidMonth(monthStr) {
  const match = monthStr.match(/^(\d{2})-(\d{4})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  return month >= 1 && month <= 12;
}

function parseMonth(monthStr) {
  const [m, y] = monthStr.split("-");
  return { month: parseInt(m, 10), year: parseInt(y, 10) };
}

function getMonthsBetween(start, end) {
  const months = [];
  const s = parseMonth(start);
  const e = parseMonth(end);
  let curr = { ...s };
  while (curr.year < e.year || (curr.year === e.year && curr.month <= e.month)) {
    months.push(`${String(curr.month).padStart(2, '0')}-${curr.year}`);
    curr.month++;
    if (curr.month > 12) {
      curr.month = 1;
      curr.year++;
    }
  }
  return months;
}

/* ============================
   Projection logic (replay chronologically)
   ============================ */
function rebuildProjection() {
  projection = {};
  const byChrono = eventsChronological();
  for (const e of byChrono) applyEvent(e);
  bus.emit("projectionUpdated");
}

function applyEvent(e) {
  if (!e || !e.type) return;
  const entryKey = e.changeId && e.entryCode ? `${e.changeId}-${e.entryCode}` : null;
  switch (e.type) {
    case "IncomeAdded":
    case "ExpenseAdded":
      if (entryKey) projection[entryKey] = { ...e, status: "pending" };
      break;
    case "ChangeValidated":
      // mark all entries in this change validated
      for (const k of Object.keys(projection)) {
        if (k.startsWith(e.changeId + '-')) projection[k].status = "validated";
      }
      break;
    case "ChangeCancelled":
      // remove entries for this change
      for (const k of Object.keys(projection)) {
        if (k.startsWith(e.changeId + '-')) delete projection[k];
      }
      break;
    case "ChangeStarted":
      // nothing to projection directly; used to identify open changes
      break;
  }
}

/* ============================
   Helpers for UI
   ============================ */
function getLabelByCode(type, code) {
  const list = type === "income" ? INCOMES : EXPENSES;
  return list.find(x => String(x.code) === String(code))?.label || "";
}

function getAllMonths() {
  const monthSet = new Set();
  for (const k in projection) {
    const entry = projection[k];
    if (entry.startMonth && entry.endMonth && isValidMonth(entry.startMonth) && isValidMonth(entry.endMonth)) {
      getMonthsBetween(entry.startMonth, entry.endMonth).forEach(m => monthSet.add(m));
    }
  }
  return Array.from(monthSet).sort((a, b) => {
    const [am, ay] = a.split('-');
    const [bm, by] = b.split('-');
    if (ay !== by) return ay - by;
    return am - bm;
  });
}

/* ============================
   Initialize projection and detect open changes
   ============================ */
rebuildProjection();

// On initialization, check if there's an open change and resume it
(function resumeOpenChange() {
  // Find all changes and check which ones are "started" (last CHANGE event is ChangeStarted)
  const allChanges = new Set(events.map(e => e.changeId).filter(Boolean));
  
  for (const changeId of allChanges) {
    const lastChangeEventType = (() => {
      const changeEvents = eventsChronological()
        .filter(e => e.changeId === changeId)
        .filter(e => ["ChangeStarted", "ChangeValidated", "ChangeCancelled"].includes(e.type));
      return changeEvents.length > 0 ? changeEvents[changeEvents.length - 1].type : null;
    })();
    
    if (lastChangeEventType === "ChangeStarted") {
      // This change is open, resume it
      currentChangeId = changeId;
      console.log("Resumed open change on initialization:", currentChangeId);
      break; // Only resume the first open change found
    }
  }
})();