/* ============================
   UI Layer
   Rendering and user interactions
   ============================ */
   

/* ============================
   Custom selectable alert
   ============================ */
function showAlert(message) {
  const modal = document.getElementById("customAlert");
  const msgBox = document.getElementById("modalMessage");
  msgBox.textContent = message;
  modal.classList.remove("hidden");
  msgBox.focus();
  console.log("ALERT:", message);
}

function closeAlert() {
  document.getElementById("customAlert").classList.add("hidden");
}

function updateUI() {
    renderEventsLog();
    renderCurrentInfo();
    renderProjection();
    renderGitGraph();
}
// Replace native alert so all calls are selectable
window.alert = showAlert;

/* ============================
   Rendering Functions
   ============================ */

function renderProjection() {
  const allMonths = getAllMonths();
  const header = document.getElementById("projectionHeader");
  const tbody = document.getElementById("projectionBody");
  const footer = document.getElementById("projectionFooter");

  header.innerHTML = "<th>Code</th><th>Label</th><th>Type</th><th>Status</th>";
  allMonths.forEach(month => header.innerHTML += `<th>${month}</th>`);

  tbody.innerHTML = "";
  const monthTotals = {};
  allMonths.forEach(m => monthTotals[m] = 0);

  const sortedKeys = Object.keys(projection).sort();

  for (const key of sortedKeys) {
    const e = projection[key];
    const typeLabel = e.type === "RevenuAjoute" ? "Revenu" : "Dépense";
    const multiplier = typeLabel === "Revenu" ? 1 : -1;
    let row = `<tr class="${typeLabel.toLowerCase()} ${e.status}">
      <td>${e.entryCode}</td>
      <td>${e.label}</td>
      <td>${typeLabel}</td>
      <td>${e.status}</td>`;
    allMonths.forEach(month => {
      const entryMonths = (isValidMonth(e.startMonth) && isValidMonth(e.endMonth)) ? getMonthsBetween(e.startMonth, e.endMonth) : [];
      if (entryMonths.includes(month)) {
        row += `<td>${Number(e.amount).toFixed(2)}</td>`;
        monthTotals[month] += Number(e.amount) * multiplier;
      } else {
        row += `<td>-</td>`;
      }
    });
    row += "</tr>";
    tbody.insertAdjacentHTML("beforeend", row);
  }

  footer.innerHTML = "<td colspan='4'>Totals</td>";
  allMonths.forEach(month => {
    const total = monthTotals[month] || 0;
    const style = total < 0 ? `color:${getComputedStyle(document.documentElement).getPropertyValue('--color-danger')}` : `color:${getComputedStyle(document.documentElement).getPropertyValue('--color-success')}`;
    footer.innerHTML += `<td style="${style}">${total.toFixed(2)}</td>`;
  });
}

function renderGitGraph() {
  const graphDiv = document.getElementById("gitGraph");
  graphDiv.innerHTML = "";
  // collect changeIds with chronological events
  const byChrono = eventsChronological();
  const changeIds = [...new Set(byChrono.map(e => e.changeId).filter(Boolean))].reverse();
  changeIds.forEach(cid => {
    const branchEvents = byChrono.filter(e => e.changeId === cid);
    const last = branchEvents[branchEvents.length - 1];
    let statusClass = "";
    let statusIcon = "●";
    if (last?.type === "VersionValidee") {
      statusClass = "validated";
      statusIcon = "✓";
    } else if (last?.type === "VersionAnnulee") {
      statusClass = "cancelled";
      statusIcon = "✕";
    } else {
      statusClass = "active";
    }
    const branch = document.createElement("div");
    branch.className = `branch ${statusClass}`;
    branch.innerHTML = `
      <div class="branch-header"><span class="branch-icon">${statusIcon}</span> <strong style="margin-left:6px">${cid}</strong> <span style="color:#666; margin-left:8px; font-size:0.9rem">(${last.type})</span></div>
      <ul class="event-list">
        ${branchEvents.map(e => {
          let detail = "";
          if (e.label && e.amount) detail += ` <span class="event-detail">(${e.label}: ${e.amount})</span>`;
          if (e.startMonth) detail += ` [${e.startMonth}${e.endMonth && e.endMonth !== e.startMonth ? ` to ${e.endMonth}` : ''}]`;
          return `<li><span class="event-dot">•</span> ${e.type} <small style="color:#666">@${e.timestamp}</small>${detail}</li>`;
        }).join("")}
      </ul>
    `;
    graphDiv.appendChild(branch);
  });
}

function renderEventsLog() {
  // show reverse chronological for readability (newest first)
  const sorted = eventsReverseChronological();
  document.getElementById("events").textContent = JSON.stringify(sorted, null, 2);
}

function renderCurrentInfo() {
  document.getElementById("currentChange").textContent = currentChangeId ? `Version en cours: ${currentChangeId}` : "Pas de version en cours";
  const latest = getLatestGlobalEvent();
  document.getElementById("latestEventInfo").textContent = latest ? `Dernier évènement reçu: ${latest.type} (${latest.changeId || "no-changeId"}) @ ${latest.timestamp}` : '';
}

function render() {
  renderEventsLog();
  renderCurrentInfo();
  renderProjection();
  renderGitGraph();
}

/* ============================
   UI Helpers
   ============================ */

function populateEntries() {
  const select = document.getElementById("entryCode");
  const type = document.getElementById("type").value;
  const list = type === "income" ? INCOMES : EXPENSES;
  select.innerHTML = list.map(e => `<option value="${e.code}">${e.code} - ${e.label}</option>`).join("");
}

/* ============================
   Subscriptions & Init
   ============================ */

bus.on("eventRecorded", render);
bus.on("projectionUpdated", renderProjection);

// Initial UI setup
populateEntries();
render();