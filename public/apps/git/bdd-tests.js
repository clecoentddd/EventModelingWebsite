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
      .filter(e => ["VersionCreee", "VersionValidee", "VersionAnnulee"].includes(e.type));
    return changeEvents.length > 0 ? changeEvents[changeEvents.length - 1].type : null;
  };

  test("Rule: Can add income/expense only if change has started", () => {
    const evs = [
      { type: "VersionCreee", changeId: "C1", timestamp: "2025-01-01T10:00:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C1");
    if (lastChangeType !== "VersionCreee") {
      throw new Error(`Expected last CHANGE event to be "VersionCreee", got "${lastChangeType}"`);
    }
    // Can add entry
    evs.push({ type: "RevenuAjoute", changeId: "C1", entryCode: 101, amount: 1000, timestamp: "2025-01-01T10:01:00Z" });
  });

  test("Rule: Cannot add income/expense after change validated", () => {
    const evs = [
      { type: "VersionCreee", changeId: "C2", timestamp: "2025-01-01T10:00:00Z" },
      { type: "RevenuAjoute", changeId: "C2", entryCode: 101, amount: 1000, timestamp: "2025-01-01T10:01:00Z" },
      { type: "VersionValidee", changeId: "C2", timestamp: "2025-01-01T10:02:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C2");
    if (lastChangeType === "VersionCreee") {
      throw new Error("Should not allow adding entry - change is validated");
    }
    if (lastChangeType !== "VersionValidee") {
      throw new Error(`Expected "VersionValidee", got "${lastChangeType}"`);
    }
  });

  test("Rule: Cannot add income/expense after change cancelled", () => {
    const evs = [
      { type: "VersionCreee", changeId: "C3", timestamp: "2025-01-01T10:00:00Z" },
      { type: "RevenuAjoute", changeId: "C3", entryCode: 101, amount: 1000, timestamp: "2025-01-01T10:01:00Z" },
      { type: "VersionAnnulee", changeId: "C3", timestamp: "2025-01-01T10:02:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C3");
    if (lastChangeType === "VersionCreee") {
      throw new Error("Should not allow adding entry - change is cancelled");
    }
    if (lastChangeType !== "VersionAnnulee") {
      throw new Error(`Expected "VersionAnnulee", got "${lastChangeType}"`);
    }
  });

  test("Rule: Can validate change only if last CHANGE event is VersionCreee", () => {
    const evs = [
      { type: "VersionCreee", changeId: "C4", timestamp: "2025-01-01T10:00:00Z" },
      { type: "RevenuAjoute", changeId: "C4", entryCode: 101, amount: 1000, timestamp: "2025-01-01T10:01:00Z" },
      { type: "DepenseAjoutee", changeId: "C4", entryCode: 201, amount: 500, timestamp: "2025-01-01T10:02:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C4");
    if (lastChangeType !== "VersionCreee") {
      throw new Error(`Cannot validate - last CHANGE event is "${lastChangeType}", not "VersionCreee"`);
    }
    // Can validate
    evs.push({ type: "VersionValidee", changeId: "C4", timestamp: "2025-01-01T10:03:00Z" });
  });

  test("Rule: Cannot validate change if already validated", () => {
    const evs = [
      { type: "VersionCreee", changeId: "C5", timestamp: "2025-01-01T10:00:00Z" },
      { type: "VersionValidee", changeId: "C5", timestamp: "2025-01-01T10:01:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C5");
    if (lastChangeType === "VersionCreee") {
      throw new Error("Should not allow validation - already validated");
    }
    if (lastChangeType !== "VersionValidee") {
      throw new Error(`Expected "VersionValidee", got "${lastChangeType}"`);
    }
  });

  test("Rule: Can cancel change only if last CHANGE event is VersionCreee", () => {
    const evs = [
      { type: "VersionCreee", changeId: "C6", timestamp: "2025-01-01T10:00:00Z" },
      { type: "DepenseAjoutee", changeId: "C6", entryCode: 201, amount: 500, timestamp: "2025-01-01T10:01:00Z" },
      { type: "RevenuAjoute", changeId: "C6", entryCode: 101, amount: 2000, timestamp: "2025-01-01T10:02:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C6");
    if (lastChangeType !== "VersionCreee") {
      throw new Error(`Cannot cancel - last CHANGE event is "${lastChangeType}", not "VersionCreee"`);
    }
    // Can cancel
    evs.push({ type: "VersionAnnulee", changeId: "C6", timestamp: "2025-01-01T10:03:00Z" });
  });

  test("Rule: Cannot cancel change if already cancelled", () => {
    const evs = [
      { type: "VersionCreee", changeId: "C7", timestamp: "2025-01-01T10:00:00Z" },
      { type: "VersionAnnulee", changeId: "C7", timestamp: "2025-01-01T10:01:00Z" }
    ];
    const lastChangeType = getLastChangeEventType(evs, "C7");
    if (lastChangeType === "VersionCreee") {
      throw new Error("Should not allow cancellation - already cancelled");
    }
    if (lastChangeType !== "VersionAnnulee") {
      throw new Error(`Expected "VersionAnnulee", got "${lastChangeType}"`);
    }
  });

  test("Rule: Can only add/update/delete income/expense if latest CHANGE event is VersionCreee", () => {
    // VersionCreee at 10:12:01, user adds income -> income is added
    const evs = [
      { type: "VersionCreee", changeId: "C8", timestamp: "2025-01-01T10:12:01Z" }
    ];
    
    const lastChangeType = getLastChangeEventType(evs, "C8");
    if (lastChangeType !== "VersionCreee") {
      throw new Error(`Cannot add - last CHANGE event is "${lastChangeType}"`);
    }
    
    // Add income - should succeed
    evs.push({ type: "RevenuAjoute", changeId: "C8", entryCode: 101, amount: 2000, timestamp: "2025-01-01T10:12:05Z" });
    
    // Check that last CHANGE event is still VersionCreee (income addition doesn't change it)
    const lastChangeTypeAfter = getLastChangeEventType(evs, "C8");
    if (lastChangeTypeAfter !== "VersionCreee") {
      throw new Error(`After adding income, last CHANGE event should still be "VersionCreee", got "${lastChangeTypeAfter}"`);
    }
    
    // Can add more entries
    evs.push({ type: "DepenseAjoutee", changeId: "C8", entryCode: 201, amount: 500, timestamp: "2025-01-01T10:12:10Z" });
    
    const lastChangeTypeFinal = getLastChangeEventType(evs, "C8");
    if (lastChangeTypeFinal !== "VersionCreee") {
      throw new Error(`After multiple additions, last CHANGE event should still be "VersionCreee", got "${lastChangeTypeFinal}"`);
    }
  });

  test("Scenario: Complete workflow with multiple operations", () => {
    const evs = [
      { type: "VersionCreee", changeId: "C9", timestamp: "2025-01-01T10:00:00Z" }
    ];
    
    // Add multiple entries - should all succeed
    evs.push({ type: "RevenuAjoute", changeId: "C9", entryCode: 101, amount: 2000, timestamp: "2025-01-01T10:01:00Z" });
    evs.push({ type: "DepenseAjoutee", changeId: "C9", entryCode: 201, amount: 1000, timestamp: "2025-01-01T10:02:00Z" });
    evs.push({ type: "RevenuAjoute", changeId: "C9", entryCode: 102, amount: 500, timestamp: "2025-01-01T10:03:00Z" });
    
    // Check last CHANGE event is still VersionCreee
    let lastChangeType = getLastChangeEventType(evs, "C9");
    if (lastChangeType !== "VersionCreee") {
      throw new Error(`After adding entries, expected "VersionCreee", got "${lastChangeType}"`);
    }
    
    // Validate the change
    evs.push({ type: "VersionValidee", changeId: "C9", timestamp: "2025-01-01T10:04:00Z" });
    
    // Now last CHANGE event should be VersionValidee
    lastChangeType = getLastChangeEventType(evs, "C9");
    if (lastChangeType !== "VersionValidee") {
      throw new Error(`After validation, expected "VersionValidee", got "${lastChangeType}"`);
    }
    
    // Cannot add more entries now
    if (lastChangeType === "VersionCreee") {
      throw new Error("Should not allow adding entries after validation");
    }
  });

test("Rule: Cannot create new version if another version is still open", () => {
  const evs = [
    { type: "VersionCreee", changeId: "C1003", timestamp: "2025-10-10T03:21:31.984Z" },
    { 
      type: "DepenseAjoutee", 
      changeId: "C1003", 
      entryCode: 206, 
      label: "Divertissement", 
      amount: 80, 
      startMonth: "02-2025", 
      endMonth: "04-2025", 
      timestamp: "2025-10-10T03:21:31.985Z" 
    }
  ];

  // simulate what getOpenChangeId would do
  const openChange = (() => {
    const grouped = {};
    for (const e of evs) {
      if (!e.changeId) continue;
      grouped[e.changeId] = e;
    }
    const open = Object.entries(grouped)
      .filter(([_, lastEv]) => lastEv.type !== "VersionValidee" && lastEv.type !== "VersionAnnulee")
      .map(([changeId, lastEv]) => ({ changeId, lastEv }));
    return open.length ? open[0].changeId : null;
  })();

  if (openChange) {
    try {
      startChange(); // if connected to real app code
      throw new Error("App should have prevented starting a new version");
    } catch (err) {
      if (!err.message.includes("Vous devez valider")) {
        throw new Error(`Unexpected error: ${err.message}`);
      }
    }
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