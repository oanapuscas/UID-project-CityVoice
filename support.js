const SUPPORT_STORAGE_KEY = "cityvoice_supported_reports";

function getSupportedReports() {
  const stored = localStorage.getItem(SUPPORT_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function setSupportedReports(supported) {
  localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(supported));
}

function isReportSupported(reportId) {
  const supported = getSupportedReports();
  return supported.includes(reportId);
}

