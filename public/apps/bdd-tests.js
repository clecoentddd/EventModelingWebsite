/* ============================
   BDD Test Runner
   Business Rule Tests
   ============================ */

function runBDDTests() {
  const out = document.getElementById("testResults");
  const results = [];
  
  const test = (name, fn) => {
    try {
      fn();
      results.push(`✅ ${name}`);
    } catch (e) {
      results.push(`❌ ${name}: ${e.message}`);
    }
  };

  // Helper to get last CHANGE event type (ignores income/expense events)
  const getLastChangeEventType = (evs, changeId) => {
    const changeEvents = evs
      .filter(e => e.changeId === changeId)
      .filter(e => ["ChangeStarted", "ChangeValidated", "ChangeCancelled"].includes(e.type));
    return changeEvents.length > 0 ? changeEvents[changeEvents.length - 1].type : null;
  };

  test("Rule: Can add income/expense only if change has started", () => {
    const evs = [
      { type: "ChangeStarted", changeId: "C1", timestamp: "2025-01-01T10:00:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C1");
    if (lastChangeType !== "ChangeStarted") {
      throw new Error(`Expected last CHANGE event to be "ChangeStarted", got "${lastChangeType}"`);
    }
    // Can add entry
    evs.push({ type: "IncomeAdded", changeId: "C1", entryCode: 101, amount: 1000, timestamp: "2025-01-01T10:01:00Z" });
  });

  test("Rule: Cannot add income/expense after change validated", () => {
    const evs = [
      { type: "ChangeStarted", changeId: "C2", timestamp: "2025-01-01T10:00:00Z" },
      { type: "IncomeAdded", changeId: "C2", entryCode: 101, amount: 1000, timestamp: "2025-01-01T10:01:00Z" },
      { type: "ChangeValidated", changeId: "C2", timestamp: "2025-01-01T10:02:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C2");
    if (lastChangeType === "ChangeStarted") {
      throw new Error("Should not allow adding entry - change is validated");
    }
    if (lastChangeType !== "ChangeValidated") {
      throw new Error(`Expected "ChangeValidated", got "${lastChangeType}"`);
    }
  });

  test("Rule: Cannot add income/expense after change cancelled", () => {
    const evs = [
      { type: "ChangeStarted", changeId: "C3", timestamp: "2025-01-01T10:00:00Z" },
      { type: "IncomeAdded", changeId: "C3", entryCode: 101, amount: 1000, timestamp: "2025-01-01T10:01:00Z" },
      { type: "ChangeCancelled", changeId: "C3", timestamp: "2025-01-01T10:02:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C3");
    if (lastChangeType === "ChangeStarted") {
      throw new Error("Should not allow adding entry - change is cancelled");
    }
    if (lastChangeType !== "ChangeCancelled") {
      throw new Error(`Expected "ChangeCancelled", got "${lastChangeType}"`);
    }
  });

  test("Rule: Can validate change only if last CHANGE event is ChangeStarted", () => {
    const evs = [
      { type: "ChangeStarted", changeId: "C4", timestamp: "2025-01-01T10:00:00Z" },
      { type: "IncomeAdded", changeId: "C4", entryCode: 101, amount: 1000, timestamp: "2025-01-01T10:01:00Z" },
      { type: "ExpenseAdded", changeId: "C4", entryCode: 201, amount: 500, timestamp: "2025-01-01T10:02:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C4");
    if (lastChangeType !== "ChangeStarted") {
      throw new Error(`Cannot validate - last CHANGE event is "${lastChangeType}", not "ChangeStarted"`);
    }
    // Can validate
    evs.push({ type: "ChangeValidated", changeId: "C4", timestamp: "2025-01-01T10:03:00Z" });
  });

  test("Rule: Cannot validate change if already validated", () => {
    const evs = [
      { type: "ChangeStarted", changeId: "C5", timestamp: "2025-01-01T10:00:00Z" },
      { type: "ChangeValidated", changeId: "C5", timestamp: "2025-01-01T10:01:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C5");
    if (lastChangeType === "ChangeStarted") {
      throw new Error("Should not allow validation - already validated");
    }
    if (lastChangeType !== "ChangeValidated") {
      throw new Error(`Expected "ChangeValidated", got "${lastChangeType}"`);
    }
  });

  test("Rule: Can cancel change only if last CHANGE event is ChangeStarted", () => {
    const evs = [
      { type: "ChangeStarted", changeId: "C6", timestamp: "2025-01-01T10:00:00Z" },
      { type: "ExpenseAdded", changeId: "C6", entryCode: 201, amount: 500, timestamp: "2025-01-01T10:01:00Z" },
      { type: "IncomeAdded", changeId: "C6", entryCode: 101, amount: 2000, timestamp: "2025-01-01T10:02:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C6");
    if (lastChangeType !== "ChangeStarted") {
      throw new Error(`Cannot cancel - last CHANGE event is "${lastChangeType}", not "ChangeStarted"`);
    }
    // Can cancel
    evs.push({ type: "ChangeCancelled", changeId: "C6", timestamp: "2025-01-01T10:03:00Z" });
  });

  test("Rule: Cannot cancel change if already cancelled", () => {
    const evs = [
      { type: "ChangeStarted", changeId: "C7", timestamp: "2025-01-01T10:00:00Z" },
      { type: "ChangeCancelled", changeId: "C7", timestamp: "2025-01-01T10:01:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C7");
    if (lastChangeType === "ChangeStarted") {
      throw new Error("Should not allow cancellation - already cancelled");
    }
    if (lastChangeType !== "ChangeCancelled") {
      throw new Error(`Expected "ChangeCancelled", got "${lastChangeType}"`);
    }
  });

  test("Rule: Can only add/update/delete income/expense if latest CHANGE event is ChangeStarted", () => {
    // ChangeStarted at 10:12:01, user adds income -> income is added
    const evs = [
      { type: "ChangeStarted", changeId: "C8", timestamp: "2025-01-01T10:12:01Z" }
    ];
    
    const lastChangeType = getLastChangeEventType(evs, "C8");
    if (lastChangeType !== "ChangeStarted") {
      throw new Error(`Cannot add - last CHANGE event is "${lastChangeType}"`);
    }
    
    // Add income - should succeed
    evs.push({ type: "IncomeAdded", changeId: "C8", entryCode: 101, amount: 2000, timestamp: "2025-01-01T10:12:05Z" });
    
    // Check that last CHANGE event is still ChangeStarted (income addition doesn't change it)
    const lastChangeTypeAfter = getLastChangeEventType(evs, "C8");
    if (lastChangeTypeAfter !== "ChangeStarted") {
      throw new Error(`After adding income, last CHANGE event should still be "ChangeStarted", got "${lastChangeTypeAfter}"`);
    }
    
    // Can add more entries
    evs.push({ type: "ExpenseAdded", changeId: "C8", entryCode: 201, amount: 500, timestamp: "2025-01-01T10:12:10Z" });
    
    const lastChangeTypeFinal = getLastChangeEventType(evs, "C8");
    if (lastChangeTypeFinal !== "ChangeStarted") {
      throw new Error(`After multiple additions, last CHANGE event should still be "ChangeStarted", got "${lastChangeTypeFinal}"`);
    }
  });

  test("Scenario: Complete workflow with multiple operations", () => {
    const evs = [
      { type: "ChangeStarted", changeId: "C9", timestamp: "2025-01-01T10:00:00Z" }
    ];
    
    // Add multiple entries - should all succeed
    evs.push({ type: "IncomeAdded", changeId: "C9", entryCode: 101, amount: 2000, timestamp: "2025-01-01T10:01:00Z" });
    evs.push({ type: "ExpenseAdded", changeId: "C9", entryCode: 201, amount: 1000, timestamp: "2025-01-01T10:02:00Z" });
    evs.push({ type: "IncomeAdded", changeId: "C9", entryCode: 102, amount: 500, timestamp: "2025-01-01T10:03:00Z" });
    
    // Check last CHANGE event is still ChangeStarted
    let lastChangeType = getLastChangeEventType(evs, "C9");
    if (lastChangeType !== "ChangeStarted") {
      throw new Error(`After adding entries, expected "ChangeStarted", got "${lastChangeType}"`);
    }
    
    // Validate the change
    evs.push({ type: "ChangeValidated", changeId: "C9", timestamp: "2025-01-01T10:04:00Z" });
    
    // Now last CHANGE event should be ChangeValidated
    lastChangeType = getLastChangeEventType(evs, "C9");
    if (lastChangeType !== "ChangeValidated") {
      throw new Error(`After validation, expected "ChangeValidated", got "${lastChangeType}"`);
    }
    
    // Cannot add more entries now
    if (lastChangeType === "ChangeStarted") {
      throw new Error("Should not allow adding entries after validation");
    }
  });

  out.innerHTML = results
    .map(r => r.includes("✅") 
      ? `<div class='test-pass'>${r}</div>` 
      : `<div class='test-fail'>${r}</div>`)
    .join("");
}

/* Quick helper to show current events in test output */
function showEventsSnapshot() {
  document.getElementById("testResults").textContent = JSON.stringify(eventsChronological(), null, 2);
}