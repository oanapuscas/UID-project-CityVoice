function getCurrentUser() {
  const SESSION_KEY = "cityvoice_user_session";
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  const session = JSON.parse(stored);
  return session.username;
}
 
function hasUserSupported(report) {
  const currentUser = getCurrentUser();
  if (!currentUser || !report.supporters) return false;
  return report.supporters.includes(currentUser);
}
 
function getSupporters(report) {
  return report.supporters || [];
}
 
function getSupportCount(report) {
  return (report.supporters || []).length;
}