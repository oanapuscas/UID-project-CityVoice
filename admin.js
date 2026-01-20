const SESSION_KEY = "cityvoice_user_session";
let db = null;
let allReports = [];
let filteredReports = [];
let currentReportId = null;
let currentAction = null;

const session = sessionStorage.getItem(SESSION_KEY);
if (!session) {
  window.location.replace("login.html");
} else {
  const userData = JSON.parse(session);
  if (userData.role !== "employee") {
    window.location.replace("map.html");
  }
  document.getElementById("employeeName").textContent = userData.username;
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.replace("login.html");
});

const statusFilter = document.getElementById("statusFilter");
const categoryFilter = document.getElementById("categoryFilter");
const departmentFilter = document.getElementById("departmentFilter");

statusFilter.addEventListener("change", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
departmentFilter.addEventListener("change", applyFilters);

const tabButtons = document.querySelectorAll(".tab-btn");
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    const view = btn.getAttribute("data-view");
    if (view === "list") {
      document.getElementById("listView").style.display = "grid";
      document.getElementById("analyticsView").style.display = "none";
    } else {
      document.getElementById("listView").style.display = "none";
      document.getElementById("analyticsView").style.display = "block";
    }
  });
});

async function loadReports() {
  try {
    db = await openDb();
    const reports = await idbGetAll(db);
    
    allReports = reports.map(report => {
      if (!report.status) report.status = "new";
      if (!report.assignedDepartment) report.assignedDepartment = null;
      if (!report.supporters) report.supporters = [];
      if (!report.statusHistory) {
        report.statusHistory = [{
          status: "new",
          timestamp: report.createdAt,
          updatedBy: "system"
        }];
      }
      return report;
    });
    
    applyFilters();
    updateStats();
  } catch (err) {
    console.error("Failed to load reports:", err);
  }
}

function applyFilters() {
  const statusValue = statusFilter.value;
  const categoryValue = categoryFilter.value;
  const departmentValue = departmentFilter.value;
  
  filteredReports = allReports.filter(report => {
    if (statusValue !== "all" && report.status !== statusValue) return false;
    if (categoryValue !== "all" && report.category !== categoryValue) return false;
    if (departmentValue !== "all") {
      if (departmentValue === "unassigned" && report.assignedDepartment) return false;
      if (departmentValue !== "unassigned" && report.assignedDepartment !== departmentValue) return false;
    }
    return true;
  });
  
  renderReports();
}

function renderReports() {
  const container = document.getElementById("listView");
  container.innerHTML = "";
  
  if (filteredReports.length === 0) {
    container.innerHTML = `
      <div style="background: white; padding: 48px; text-align: center; border-radius: 12px;">
        <p style="color: #666; font-size: 14px;">No reports match the current filters.</p>
      </div>
    `;
    return;
  }
  
  filteredReports.sort((a, b) => b.createdAt - a.createdAt).forEach(report => {
    const card = createReportCard(report);
    container.appendChild(card);
  });
}

function createReportCard(report) {
  const card = document.createElement("div");
  card.className = "report-card";
  
  const statusClass = `status-${report.status}`;
  const statusLabel = formatStatus(report.status);
  const dateStr = new Date(report.createdAt).toLocaleString();
  const supportCount = report.supporters ? report.supporters.length : 0;
  
  const contact = report.contact || {};
  const contactInfo = contact.name || contact.email || contact.phone 
    ? `
      <div class="contact-info">
        <h4>Contact Information</h4>
        ${contact.name ? `<p><strong>Name:</strong> ${escapeHtml(contact.name)}</p>` : ""}
        ${contact.email ? `<p><strong>Email:</strong> ${escapeHtml(contact.email)}</p>` : ""}
        ${contact.phone ? `<p><strong>Phone:</strong> ${escapeHtml(contact.phone)}</p>` : ""}
      </div>
    ` : "<p style='font-size: 12px; color: #999; margin-top: 8px;'>No contact information provided</p>";
  
  const photoPreview = report.photos && report.photos.length > 0
    ? `<div class="photo-preview">${report.photos.slice(0, 3).map(blob => {
        const url = URL.createObjectURL(blob);
        return `<img src="${url}" alt="Report photo">`;
      }).join("")}</div>`
    : "";
  
  const departmentBadge = report.assignedDepartment
    ? `<div style="margin-top: 8px;"><span style="background: #E3F2FD; color: #1976D2; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">📋 ${escapeHtml(report.assignedDepartment)}</span></div>`
    : "";
  
  card.innerHTML = `
    <div class="report-header">
      <div style="flex: 1;">
        <h3 class="report-title">${escapeHtml(report.category)}</h3>
        <div class="report-meta">
          Created: ${escapeHtml(dateStr)}<br>
          By: ${escapeHtml(report.createdBy || "Anonymous")}
        </div>
      </div>
      <span class="status-badge ${statusClass}">${statusLabel}</span>
    </div>
    
    ${report.notes ? `<div class="report-details">${escapeHtml(report.notes)}</div>` : ""}
    
    <div class="report-location">
      📍 Lat: ${Number(report.lat).toFixed(5)}, Lng: ${Number(report.lng).toFixed(5)}
    </div>
    
    ${departmentBadge}
    
    <span class="support-count">👍 ${supportCount} ${supportCount === 1 ? 'supporter' : 'supporters'}</span>
    
    ${photoPreview}
    ${contactInfo}
    
    <div class="report-actions">
      ${report.status === "new" || report.status === "assigned" ? `
        <button class="btn btn-assign" onclick="openAssignModal('${report.id}')">
          ${report.assignedDepartment ? 'Reassign' : 'Assign Department'}
        </button>
      ` : ""}
      ${report.status === "assigned" ? `
        <button class="btn btn-resolve" onclick="updateStatus('${report.id}', 'in_progress')">
          Start Work
        </button>
      ` : ""}
      ${report.status === "in_progress" ? `
        <button class="btn btn-resolve" onclick="confirmStatusUpdate('${report.id}', 'resolved')">
          Mark Resolved
        </button>
      ` : ""}
      ${report.status === "new" ? `
        <button class="btn btn-reject" onclick="confirmReject('${report.id}')">
          Reject
        </button>
      ` : ""}
    </div>
  `;
  
  return card;
}

function formatStatus(status) {
  const statusMap = {
    "new": "New",
    "assigned": "Assigned",
    "in_progress": "In Progress",
    "resolved": "Resolved"
  };
  return statusMap[status] || status;
}

function openAssignModal(reportId) {
  currentReportId = reportId;
  const modal = document.getElementById("assignModal");
  modal.classList.add("show");
  
  const report = allReports.find(r => r.id === reportId);
  if (report && report.assignedDepartment) {
    document.getElementById("departmentSelect").value = report.assignedDepartment;
  } else {
    document.getElementById("departmentSelect").value = "";
  }
}

function closeAssignModal() {
  document.getElementById("assignModal").classList.remove("show");
  currentReportId = null;
}

async function confirmAssign() {
  const department = document.getElementById("departmentSelect").value;
  
  if (!department) {
    alert("Please select a department");
    return;
  }
  
  const report = allReports.find(r => r.id === currentReportId);
  if (!report) return;
  
  report.assignedDepartment = department;
  if (report.status === "new") {
    report.status = "assigned";
    addStatusHistory(report, "assigned");
  }
  
  await idbPut(db, report);
  
  closeAssignModal();
  applyFilters();
  updateStats();
}

function confirmStatusUpdate(reportId, newStatus) {
  currentReportId = reportId;
  currentAction = () => updateStatus(reportId, newStatus);
  
  const modal = document.getElementById("confirmModal");
  const title = document.getElementById("confirmTitle");
  const message = document.getElementById("confirmMessage");
  const confirmBtn = document.getElementById("confirmBtn");
  
  title.textContent = "Confirm Status Update";
  message.textContent = `Are you sure you want to mark this report as ${formatStatus(newStatus)}?`;
  confirmBtn.className = "btn btn-resolve";
  confirmBtn.textContent = "Confirm";
  
  modal.classList.add("show");
}

function confirmReject(reportId) {
  currentReportId = reportId;
  currentAction = () => deleteReport(reportId);
  
  const modal = document.getElementById("confirmModal");
  const title = document.getElementById("confirmTitle");
  const message = document.getElementById("confirmMessage");
  const confirmBtn = document.getElementById("confirmBtn");
  
  title.textContent = "Confirm Rejection";
  message.textContent = "Are you sure you want to reject and delete this report? This action cannot be undone.";
  confirmBtn.className = "btn btn-reject";
  confirmBtn.textContent = "Reject & Delete";
  
  modal.classList.add("show");
}

function closeConfirmModal() {
  document.getElementById("confirmModal").classList.remove("show");
  currentReportId = null;
  currentAction = null;
}

async function executeConfirmedAction() {
  if (currentAction) {
    await currentAction();
  }
  closeConfirmModal();
}

async function updateStatus(reportId, newStatus) {
  const report = allReports.find(r => r.id === reportId);
  if (!report) return;
  
  report.status = newStatus;
  addStatusHistory(report, newStatus);
  
  await idbPut(db, report);
  
  applyFilters();
  updateStats();
}

async function deleteReport(reportId) {
  const index = allReports.findIndex(r => r.id === reportId);
  if (index === -1) return;
  
  const tx = db.transaction("reports", "readwrite");
  const store = tx.objectStore("reports");
  await store.delete(reportId);
  
  allReports.splice(index, 1);
  applyFilters();
  updateStats();
}

function addStatusHistory(report, newStatus) {
  if (!report.statusHistory) report.statusHistory = [];
  
  const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
  
  report.statusHistory.push({
    status: newStatus,
    timestamp: Date.now(),
    updatedBy: session.username
  });
}

function updateStats() {
  document.getElementById("totalReports").textContent = allReports.length;
  document.getElementById("newReports").textContent = allReports.filter(r => r.status === "new").length;
  document.getElementById("assignedReports").textContent = allReports.filter(r => r.status === "assigned" || r.status === "in_progress").length;
  document.getElementById("resolvedReports").textContent = allReports.filter(r => r.status === "resolved").length;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadReports();
