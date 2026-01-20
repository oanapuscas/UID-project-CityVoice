async function toggleSupport(reportId) {
  if (!db) return false;
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("You must be logged in to support reports");
    return false;
  }
  
  try {
    const report = await idbGet(db, reportId);
    if (!report) return false;
     
    if (!report.supporters) {
      report.supporters = [];
    }
    
    const hasSupported = report.supporters.includes(currentUser);
    
    if (hasSupported) { 
      report.supporters = report.supporters.filter(user => user !== currentUser);
    } else { 
      report.supporters.push(currentUser);
    }
    
    await idbPut(db, report);
     
    const marker = savedMarkers.find(m => {
      const markerReport = reportsMap.get(m);
      return markerReport && markerReport.id === reportId;
    });
    
    if (marker) {
      reportsMap.set(marker, report);
      const updatedHtml = buildPopupHtmlPublic(report);
      marker.setPopupContent(updatedHtml);
      marker.openPopup();
      
      setTimeout(() => {
        const supportBtn = document.getElementById(`support-btn-${reportId}`);
        if (supportBtn) {
          supportBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await handleSupportClick(report.id, supportBtn);
          };
        }
      }, 100);
    }
    
    return !hasSupported;
  } catch (err) {
    console.error("Error toggling support:", err);
    return false;
  }
}

async function handleSupportClick(reportId, button) {
  const wasSupported = await toggleSupport(reportId);
  
  if (button) {
    button.classList.add("support-animate");
    setTimeout(() => {
      button.classList.remove("support-animate");
    }, 600);
  }
}

const map = L.map("map").setView([46.7712, 23.6236], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

let searchMarker = null;

const geocoderControl = L.Control.geocoder({
  defaultMarkGeocode: false
}).addTo(map);

geocoderControl.on("markgeocode", function (e) {
  const g = e.geocode;
  const label = (g && g.name) ? String(g.name) : "";
  const lower = label.toLowerCase();

  const ok =
    lower.includes("cluj-napoca") ||
    lower.includes("cluj napoca") ||
    lower.includes("municipiul cluj-napoca");

  if (!ok) {
    alert("Only Cluj-Napoca locations allowed.");
    return;
  }

  const center = g.center;

  if (searchMarker) map.removeLayer(searchMarker);
  searchMarker = L.marker(center).addTo(map).bindPopup(label);

  map.flyTo(center, 17);
  searchMarker.openPopup();
});

const categoryEl = document.getElementById("category");
const notesEl = document.getElementById("notes");
const photosEl = document.getElementById("photos");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const statusEl = document.getElementById("status");

const reporterNameEl = document.getElementById("reporterName");
const reporterEmailEl = document.getElementById("reporterEmail");
const reporterPhoneEl = document.getElementById("reporterPhone");
const publicAnonymousEl = document.getElementById("publicAnonymous");

const previewEls = [
  { img: document.getElementById("preview1"), label: document.getElementById("label1") },
  { img: document.getElementById("preview2"), label: document.getElementById("label2") },
  { img: document.getElementById("preview3"), label: document.getElementById("label3") },
];

let draftLatLng = null;
let draftMarker = null;

let selectedFiles = [];
let previewUrls = [];
let db = null;

const savedMarkers = [];
const reportsMap = new Map();

photosEl.addEventListener("change", async () => {
  const files = Array.from(photosEl.files || []);

  for (const file of files) {
    if (selectedFiles.length >= 3) break;
    selectedFiles.push(file);
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    setPreview(selectedFiles.length - 1, url);
  }

  photosEl.value = "";
});

function resetPreviews() {
  for (const u of previewUrls) URL.revokeObjectURL(u);
  previewUrls = [];

  previewEls.forEach((slot, idx) => {
    slot.img.src = "";
    slot.img.style.display = "none";
    slot.label.style.display = "block";
    slot.label.textContent = `Photo ${idx + 1}`;
  });
}

function setPreview(index, url) {
  const slot = previewEls[index];
  slot.img.src = url;
  slot.img.style.display = "block";
  slot.label.style.display = "none";
}

let longPressTimer = null;
let isLongPress = false;

map.on("click", (e) => {
  if (isLongPress) {
    isLongPress = false;
    return;
  }
  handleLocationSelect(e.latlng);
});

map.getContainer().addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  longPressTimer = setTimeout(() => {
    const containerPoint = map.mouseEventToContainerPoint(e);
    const latlng = map.containerPointToLatLng(containerPoint);
    isLongPress = true;
    handleLocationSelect(latlng, true);
  }, 500);
});

map.getContainer().addEventListener("mouseup", () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
});

map.getContainer().addEventListener("mouseleave", () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
});

let touchStartTime = null;
map.getContainer().addEventListener("touchstart", (e) => {
  touchStartTime = Date.now();
  const touch = e.touches[0];
  const containerPoint = L.point(touch.clientX, touch.clientY);
  const latlng = map.containerPointToLatLng(containerPoint);
  
  longPressTimer = setTimeout(() => {
    isLongPress = true;
    handleLocationSelect(latlng, true);
    e.preventDefault();
  }, 500);
});

map.getContainer().addEventListener("touchend", (e) => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  if (!isLongPress && touchStartTime && (Date.now() - touchStartTime < 500)) {
  }
  isLongPress = false;
  touchStartTime = null;
});

function handleLocationSelect(latlng, isLongPress = false) {
  draftLatLng = latlng;

  if (!draftMarker) {
    draftMarker = L.marker(latlng, { opacity: 0.7 }).addTo(map);
  } else {
    draftMarker.setLatLng(latlng);
  }

  const method = isLongPress ? "Long-pressed" : "Clicked";
  setStatus(
    `${method} location selected: Lat ${latlng.lat.toFixed(5)}, Lng ${latlng.lng.toFixed(5)}. Now press Save report.`,
    "ok"
  );
}

saveBtn.addEventListener("click", async () => {
  if (!draftLatLng) {
    setStatus("Pick a location first: click the map to set a draft pin.", "bad");
    return;
  }
  if (!db) {
    setStatus("Database not ready yet. Refresh the page.", "bad");
    return;
  }

  const currentUser = getCurrentUser();
  const reporterName = (reporterNameEl.value || "").trim();
  const reporterEmail = (reporterEmailEl.value || "").trim();
  const reporterPhone = (reporterPhoneEl.value || "").trim();
  const publicAnonymous = !!publicAnonymousEl.checked;

  const report = {
    id: makeId(),
    lat: draftLatLng.lat,
    lng: draftLatLng.lng,
    category: categoryEl.value,
    notes: (notesEl.value || "").trim(),
    createdAt: Date.now(),
    photos: selectedFiles.slice(0, 3),
    supporters: [],
    createdBy: currentUser,
    contact: {
      name: reporterName,
      email: reporterEmail,
      phone: reporterPhone,
      publicAnonymous
    }
  };

  try {
    await idbPut(db, report);
    placeSavedMarker(report);

    clearDraftOnly();

    notesEl.value = "";
    selectedFiles = [];
    resetPreviews();

    reporterNameEl.value = "";
    reporterEmailEl.value = "";
    reporterPhoneEl.value = "";
    publicAnonymousEl.checked = true;

    setStatus("Report saved. Public map stays anonymous. Details stored privately.", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Failed to save report (IndexedDB error). Check console.", "bad");
  }
});

clearBtn.addEventListener("click", () => {
  clearDraftOnly();
  notesEl.value = "";
  selectedFiles = [];
  resetPreviews();

  reporterNameEl.value = "";
  reporterEmailEl.value = "";
  reporterPhoneEl.value = "";
  publicAnonymousEl.checked = true;

  setStatus("Draft cleared. Click the map to choose a new draft location.", "");
});

function clearDraftOnly() {
  if (draftMarker) {
    map.removeLayer(draftMarker);
    draftMarker = null;
  }
  draftLatLng = null;
}

clearAllBtn.addEventListener("click", async () => {
  if (!db) return;
  if (!confirm("This will remove ALL saved reports from this browser. Continue?")) return;

  try {
    await idbClear(db);
    while (savedMarkers.length) {
      const m = savedMarkers.pop();
      map.removeLayer(m);
    }
    setStatus("All saved reports cleared", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Failed to clear saved reports (IndexedDB error).", "bad");
  }
});

function placeSavedMarker(report) {
  if (!report.supporters) report.supporters = [];
  const popupHtml = buildPopupHtmlPublic(report);
  const marker = L.marker([report.lat, report.lng]).addTo(map);
  marker.bindPopup(popupHtml);
  
  marker.on("popupopen", () => {
    setTimeout(() => {
      const supportBtn = document.getElementById(`support-btn-${report.id}`);
      if (supportBtn) {
        supportBtn.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await handleSupportClick(report.id, supportBtn);
        };
      }
    }, 50);
  });
  
  savedMarkers.push(marker);
  reportsMap.set(marker, report);
}

function buildPopupHtmlPublic(report) {
  const notes = report.notes ? `<div style="margin-bottom:6px;">${escapeHtml(report.notes)}</div>` : "";

  const contact = report.contact || {};
  const isAnon = contact.publicAnonymous !== false;
  const publicReporterLine =
    (!isAnon && contact.name)
      ? `<div style="color:#666;font-size:12px;margin-bottom:6px;">Reported by: ${escapeHtml(contact.name)}</div>`
      : `<div style="color:#666;font-size:12px;margin-bottom:6px;">Reported anonymously</div>`;

  let thumbs = `<div style="margin-top:8px;color:#666;font-size:12px;">No photos attached.</div>`;
  if (report.photos && report.photos.length) {
    const imgs = report.photos.slice(0, 3).map((blob) => {
      const url = URL.createObjectURL(blob);
      return `<img src="${url}" alt="Report photo"
        style="width:100%;height:60px;object-fit:cover;border-radius:8px;border:1px solid #eee;">`;
    }).join("");
    thumbs = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;">${imgs}</div>`;
  }

  const dateStr = new Date(report.createdAt).toLocaleString();
  const supportCount = getSupportCount(report);
  const currentUser = getCurrentUser();
  const isSupported = hasUserSupported(report);
  const supportButtonClass = isSupported ? "support-btn supported" : "support-btn";
  const supportText = isSupported ? "Supported" : "Support";
   
  let supportersList = "";
  if (supportCount > 0) {
    const supporters = getSupporters(report);
    const displaySupporters = supporters.slice(0, 5);  
    const remaining = supportCount - displaySupporters.length;
    
    supportersList = `
      <div style="margin-top:8px;padding:8px;background:#f9f9f9;border-radius:6px;font-size:11px;color:#666;">
        <strong style="color:#333;">Supported by:</strong> ${displaySupporters.map(u => escapeHtml(u)).join(", ")}${remaining > 0 ? ` and ${remaining} more` : ""}
      </div>
    `;
  }

  const status = report.status || 'new';
  const statusColors = {
    'new': { bg: '#FFF3E0', color: '#F57C00' },
    'assigned': { bg: '#E3F2FD', color: '#1976D2' },
    'in_progress': { bg: '#F3E5F5', color: '#7B1FA2' },
    'resolved': { bg: '#E8F5E9', color: '#388E3C' }
  };
  const statusLabels = {
    'new': 'New',
    'assigned': 'Assigned',
    'in_progress': 'In Progress',
    'resolved': 'Resolved'
  };
  const statusStyle = statusColors[status] || statusColors['new'];
  const statusLabel = statusLabels[status] || status;
  
  const statusBadge = `
    <div style="margin-top:8px;padding:6px 10px;background:${statusStyle.bg};color:${statusStyle.color};border-radius:12px;font-size:11px;font-weight:600;display:inline-block;">
      ${statusLabel}
    </div>
  `;
  
  const departmentInfo = report.assignedDepartment 
    ? `<div style="margin-top:6px;color:#666;font-size:11px;">${escapeHtml(report.assignedDepartment)}</div>`
    : '';

  return `
    <div style="min-width:240px;">
      <div style="font-weight:700;margin-bottom:4px;">${escapeHtml(report.category)}</div>
      ${publicReporterLine}
      ${statusBadge}
      ${departmentInfo}
      ${notes}
      <div style="color:#666;font-size:12px;">
        Saved: ${escapeHtml(dateStr)}<br>
        Lat: ${Number(report.lat).toFixed(5)}<br>
        Lng: ${Number(report.lng).toFixed(5)}
      </div>
      ${thumbs}
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #eee;">
        <button id="support-btn-${report.id}" class="${supportButtonClass}" data-report-id="${report.id}" style="width:100%;padding:8px 12px;background:${isSupported ? "#4CAF50" : "#f0f0f0"};color:${isSupported ? "white" : "#333"};border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.3s ease;">
          ${supportText} (${supportCount})
        </button>
        ${supportersList}
      </div>
    </div>
  `;
}

function setStatus(text, tone) {
  statusEl.textContent = text;
  statusEl.classList.remove("ok", "bad");
  if (tone === "ok") statusEl.classList.add("ok");
  if (tone === "bad") statusEl.classList.add("bad");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

(async function boot() {
  try {
    db = await openDb();
    const reports = await idbGetAll(db);
    for (const r of reports) {
      if (!r.supporters) r.supporters = [];
      placeSavedMarker(r);
    }
    setStatus(`Loaded ${reports.length} saved report(s) from IndexedDB`, "ok");
  } catch (err) {
    console.error(err);
    setStatus("Failed to open IndexedDB. Check console.", "bad");
  }
  resetPreviews();
})();