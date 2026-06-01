// CJ的漫旅 · 共享认证模块
// 所有页面引入此文件以保持登录状态一致

const SUPABASE_URL = 'https://vlxmozvgbxxpgbiddzkm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AAtzomCzMso5kLlyDe5PQw_bWEKnHG9';

let supabaseAuth = null;
let currentUser = null;
let currentSession = null;

function getAuthSupabase() {
  if (!supabaseAuth && window.supabase) {
    supabaseAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseAuth;
}

function openAuth() {
  var el = document.getElementById('authModal');
  if (el) el.classList.add('show');
}

function closeAuth() {
  var el = document.getElementById('authModal');
  if (el) el.classList.remove('show');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  var loginEl = document.getElementById('authLogin');
  var signupEl = document.getElementById('authSignup');
  var errEl = document.getElementById('authError');
  if (loginEl) loginEl.style.display = tab === 'login' ? 'block' : 'none';
  if (signupEl) signupEl.style.display = tab === 'signup' ? 'block' : 'none';
  if (errEl) errEl.textContent = '';
}

async function handleLogin() {
  var sb = getAuthSupabase();
  if (!sb) return alert('系统初始化中');

  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPassword').value;
  var errEl = document.getElementById('authError');

  if (!email || !password) {
    if (errEl) errEl.textContent = '请填写邮箱和密码';
    return;
  }

  var result = await sb.auth.signInWithPassword({ email: email, password: password });
  if (result.error) {
    if (errEl) errEl.textContent = result.error.message === 'Invalid login credentials' ? '邮箱或密码错误' : result.error.message;
    return;
  }

  currentUser = result.data.user;
  currentSession = result.data.session;
  closeAuth();
  updateUserUI();
  onUserLoggedIn();
}

async function handleSignup() {
  var sb = getAuthSupabase();
  if (!sb) return alert('系统初始化中');

  var email = document.getElementById('signupEmail').value.trim();
  var password = document.getElementById('signupPassword').value;
  var errEl = document.getElementById('authError');

  if (!email || !password) {
    if (errEl) errEl.textContent = '请填写邮箱和密码';
    return;
  }
  if (password.length < 6) {
    if (errEl) errEl.textContent = '密码至少6位';
    return;
  }

  var result = await sb.auth.signUp({ email: email, password: password });
  if (result.error) {
    if (errEl) errEl.textContent = result.error.message;
    return;
  }

  if (result.data.user && result.data.session) {
    currentUser = result.data.user;
    currentSession = result.data.session;
    closeAuth();
    updateUserUI();
    onUserLoggedIn();
  } else {
    if (errEl) errEl.textContent = '注册成功！请检查邮箱确认链接';
    setTimeout(async function() {
      var sb2 = getAuthSupabase();
      var r2 = await sb2.auth.getSession();
      if (r2.data.session) {
        currentUser = r2.data.session.user;
        currentSession = r2.data.session;
        closeAuth();
        updateUserUI();
        onUserLoggedIn();
      }
    }, 1500);
  }
}

async function handleLogout() {
  var sb = getAuthSupabase();
  if (sb) await sb.auth.signOut();
  currentUser = null;
  currentSession = null;
  updateUserUI();
  onUserLoggedOut();
}

function updateUserUI() {
  var loginBtn = document.getElementById('navLoginBtn');
  var userArea = document.getElementById('navUserArea');
  var userEmail = document.getElementById('userEmailDisplay');

  if (currentUser) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userArea) userArea.style.display = 'flex';
    if (userEmail) userEmail.textContent = currentUser.email;
  } else {
    if (loginBtn) loginBtn.style.display = '';
    if (userArea) userArea.style.display = 'none';
  }
}

// 页面可覆盖这些回调
function onUserLoggedIn() { /* 子页面可覆盖 */ }
function onUserLoggedOut() { /* 子页面可覆盖 */ }

// 初始化
async function initAuth() {
  var sb = getAuthSupabase();
  if (sb) {
    var result = await sb.auth.getSession();
    if (result.data.session) {
      currentUser = result.data.session.user;
      currentSession = result.data.session;
    }
    updateUserUI();

    sb.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        currentSession = session;
        updateUserUI();
        onUserLoggedIn();
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentSession = null;
        updateUserUI();
        onUserLoggedOut();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
