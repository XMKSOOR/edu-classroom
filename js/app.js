/* ========== LOGGER ========== */
var Logger = {
  _ts: function() { return new Date().toISOString().slice(11, 19); },
  info: function(m) { console.log('[' + Logger._ts() + '] [INFO] ' + m); },
  warn: function(m) { console.warn('[' + Logger._ts() + '] [WARN] ' + m); },
  error: function(m) { console.error('[' + Logger._ts() + '] [ERROR] ' + m); }
};

/* ========== COLORS ========== */
var COLORS = [
  {bg: '#1a73e8', grad: 'linear-gradient(135deg,#1a73e8,#0d47a1)'},
  {bg: '#1e8e3e', grad: 'linear-gradient(135deg,#1e8e3e,#0d5c24)'},
  {bg: '#8430ce', grad: 'linear-gradient(135deg,#8430ce,#5c1f96)'},
  {bg: '#fa7b17', grad: 'linear-gradient(135deg,#fa7b17,#c45c0d)'},
  {bg: '#d93025', grad: 'linear-gradient(135deg,#d93025,#9a1f1a)'},
  {bg: '#006064', grad: 'linear-gradient(135deg,#006064,#00363a)'}
];

/* ========== GLOBALS ========== */
var currentUser = null;
var _cloudClasses = [];
var notifTimeout = null;

/* ========== NOTIFICATION ========== */
function showNotification(msg) {
  var n = document.getElementById('notification');
  if (!n) return;
  n.innerHTML = '<i class="ti ti-info-circle"></i> ' + msg;
  n.classList.remove('hidden');
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(function() { n.classList.add('hidden'); }, 3000);
}

/* ========== AUTH ========== */
function logout() {
  localStorage.removeItem('edu_user');
  localStorage.removeItem('edu_just_logged_in');
  auth.signOut().then(function() { window.location.href = 'index.html'; });
}

/* ========== AUTH STATE (update user data only, NO redirects) ========== */
auth.onAuthStateChanged(function(user) {
  if (user) {
    localStorage.removeItem('edu_just_logged_in');
    db.collection('users').doc(user.uid).get().then(function(snap) {
      var data = snap.data() || {role: 'student', name: user.displayName || 'مستخدم'};
      currentUser = {uid: user.uid, name: data.name, role: data.role};
      localStorage.setItem('edu_user', JSON.stringify(currentUser));
    });
  } else {
    // Firebase session not restored yet — use cached data if available
    var cached = localStorage.getItem('edu_user');
    if (cached) {
      try { currentUser = JSON.parse(cached); } catch (e) { currentUser = null; }
    } else {
      currentUser = null;
    }
  }
});

/* ========== HELPERS ========== */
function getClassRef() {
  if (!currentUser) return null;
  return db.collection('classes').where('members', 'array-contains', currentUser.uid);
}
function getAllClassesRef() { return db.collection('classes'); }
function getClassIdFromUrl() { return new URLSearchParams(window.location.search).get('id'); }
