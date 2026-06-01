// ============================================================
// CJ的漫旅 · 主脚本（首页专用：目的地渲染 + AI聊天 + 行程管理）
// 依赖：auth.js（提供认证和 currentUser/currentSession）
// ============================================================

let conversationHistory = [];

// ---- 回调：登录/登出时的首页特殊处理 ----
onUserLoggedIn = function() {
  initChatAgent();
};

onUserLoggedOut = function() {
  conversationHistory = [];
  resetChatUI();
  showChatPrompt();
};

// ============================================================
// DESTINATION DATA
// ============================================================
const destinations = [
  { name:"京都·岚山", loc:"日本", badge:"出境热门", rating:"4.9", reviews:"2.3万", price:"¥12,800", unit:"/人起", color1:"#1a5276", color2:"#2980b9", emoji:"🎋", tag:"abroad" },
  { name:"三亚·亚龙湾", loc:"海南", badge:"国内精选", rating:"4.8", reviews:"1.8万", price:"¥3,200", unit:"/人起", color1:"#0e6655", color2:"#1abc9c", emoji:"🏖️", tag:"island" },
  { name:"丽江古城", loc:"云南", badge:"文化之旅", rating:"4.7", reviews:"3.1万", price:"¥2,800", unit:"/人起", color1:"#7b241c", color2:"#c0392b", emoji:"🏯", tag:"domestic" },
  { name:"马尔代夫·北马累", loc:"马尔代夫", badge:"蜜月推荐", rating:"4.9", reviews:"5600", price:"¥18,500", unit:"/人起", color1:"#0e4f6e", color2:"#2596be", emoji:"🌹", tag:"island" },
  { name:"川西稻城亚丁", loc:"四川", badge:"自然秘境", rating:"4.8", reviews:"1.2万", price:"¥5,600", unit:"/人起", color1:"#4a235a", color2:"#884ea0", emoji:"🏔️", tag:"nature" },
  { name:"巴黎·圣心堂", loc:"法国", badge:"浪漫之都", rating:"4.8", reviews:"4.2万", price:"¥22,000", unit:"/人起", color1:"#2c3e50", color2:"#7f8c8d", emoji:"🛉", tag:"abroad" },
  { name:"新疆喀纳斯", loc:"新疆", badge:"摄影圣地", rating:"4.9", reviews:"8800", price:"¥7,200", unit:"/人起", color1:"#145a32", color2:"#1e8449", emoji:"🌲", tag:"nature" },
  { name:"厦门·鼓浪屿", loc:"福建", badge:"文艺小岛", rating:"4.7", reviews:"5.5万", price:"¥1,800", unit:"/人起", color1:"#1a5276", color2:"#5dade2", emoji:"🖍", tag:"domestic" },
];

function renderDestCards(filter) {
  filter = filter || 'all';
  var grid = document.getElementById('destGrid');
  if (!grid) return;
  var filtered = filter === 'all' ? destinations : destinations.filter(function(d) { return d.tag === filter; });
  grid.innerHTML = filtered.map(function(d, i) {
    return '<div class="dest-card" onclick="planTrip(\'' + d.name + '\')">' +
      '<div class="dest-img-wrapper">' +
        '<svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg">' +
          '<defs><linearGradient id="g' + i + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="' + d.color1 + '"/>' +
            '<stop offset="100%" stop-color="' + d.color2 + '"/>' +
          '</linearGradient></defs>' +
          '<rect width="300" height="180" fill="url(#g' + i + ')"/>' +
          '<text x="150" y="95" text-anchor="middle" dominant-baseline="middle" font-size="52" opacity="0.35">' + d.emoji + '</text>' +
          '<text x="150" y="140" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="11" font-family="sans-serif">' + d.loc + '</text>' +
        '</svg>' +
        '<span class="dest-badge">' + d.badge + '</span>' +
        '<button class="dest-heart" onclick="event.stopPropagation();toggleHeart(this)">&#9825;</button>' +
      '</div>' +
      '<div class="dest-info">' +
        '<div class="dest-name">' + d.name + '</div>' +
        '<div class="dest-loc"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#9a9aaa"/></svg>' + d.loc + '</div>' +
        '<div class="dest-meta">' +
          '<div class="dest-rating"><span class="stars">★</span>' + d.rating + '<span style="color:var(--text-hint)">(' + d.reviews + '条)</span></div>' +
          '<div class="dest-price">' + d.price + '<span>' + d.unit + '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleHeart(btn) {
  btn.classList.toggle('liked');
  btn.innerHTML = btn.classList.contains('liked') ? '&#9829;' : '&#9825;';
}

function switchTab(tab, filter) {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  tab.classList.add('active');
  renderDestCards(filter);
}

function planTrip(dest) {
  var el = document.getElementById('ai-planner');
  if (!el) return;
  el.scrollIntoView({behavior:'smooth'});
  setTimeout(function() {
    var input = document.getElementById('chatInput');
    if (input) { input.value = '我想去' + dest + '旅游，请帮我规划行程'; input.focus(); }
  }, 600);
}

function handleSearch() {
  var val = document.getElementById('heroSearch');
  if (!val) return;
  val = val.value.trim();
  if (!val) return;
  var el = document.getElementById('ai-planner');
  if (!el) return;
  el.scrollIntoView({behavior:'smooth'});
  setTimeout(function() {
    var input = document.getElementById('chatInput');
    if (input) { input.value = '我想去' + val + '旅游，请帮我规划详细的行程安排'; input.focus(); }
  }, 600);
}

// ============================================================
// AI CHAT
// ============================================================

var SYSTEM_PROMPT_CONTENT = '你是一位资深的旅行规划师，名叫"CJ的漫旅AI"。你的任务是为用户提供专业、详细的旅行行程规划建议。\n\n核心能力：\n1. 根据用户的目的地、天数、预算、偏好（亲子/蜜月/美食/摄影/户外等），生成详细的逐日行程\n2. 行程包含：每天上午/下午/晚上的景点安排、推荐餐厅、交通方式、住宿建议\n3. 提供预算估算、签证提示、当地天气穿衣建议\n4. 推荐小众但值得去的景点，不只推荐热门打卡地\n\n回复风格：\n- 用热情、专业的语气，适度使用旅行相关 emoji\n- 行程部分用清晰的分天结构\n- 预算使用人民币 ¥ 标注\n- 每次回复结尾主动询问是否需要调整\n\n重要：你要像真正的旅行规划专家一样思考，给出实用、具体、可落地的建议。不要泛泛而谈。';

function initChatAgent() {
  conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT_CONTENT }];
  var badge = document.getElementById('apiStatusBadge');
  if (badge) { badge.textContent = 'AI已连接'; badge.className = 'api-status set'; }
  showChatPrompt();
}

function showChatPrompt() {
  var msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  msgs.innerHTML = '';
  var div = document.createElement('div');
  div.className = 'msg ai';
  div.innerHTML = '<div class="msg-avatar">🤖</div><div class="msg-bubble">你好！我是你的专属旅行规划师 ✈️<br><br>告诉我你想去哪里、出行几天、大概预算是多少，我来帮你制定一份<strong>完美的行程安排</strong>！</div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function resetChatUI() {
  var msgs = document.getElementById('chatMessages');
  if (msgs) msgs.innerHTML = '';
  var badge = document.getElementById('apiStatusBadge');
  if (badge) { badge.textContent = '请先登录'; badge.className = 'api-status unset'; }
  var suggestions = document.getElementById('chatSuggestions');
  if (suggestions) suggestions.style.display = 'flex';
}

function addMsg(content, isUser) {
  var container = document.getElementById('chatMessages');
  if (!container) return null;
  var div = document.createElement('div');
  div.className = 'msg ' + (isUser ? 'user' : 'ai');
  div.innerHTML = '<div class="msg-avatar">' + (isUser ? '👁' : '🤖') + '</div><div class="msg-bubble">' + content + '</div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function showTyping() {
  var container = document.getElementById('chatMessages');
  if (!container) return;
  var div = document.createElement('div');
  div.className = 'msg ai'; div.id = 'typing';
  div.innerHTML = '<div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTyping() {
  var el = document.getElementById('typing');
  if (el) el.remove();
}

function formatAIResponse(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
}

async function sendMessage() {
  var input = document.getElementById('chatInput');
  if (!input) return;
  var msg = input.value.trim();
  if (!msg) return;

  if (!currentUser) {
    openAuth();
    return;
  }

  var suggestions = document.getElementById('chatSuggestions');
  if (suggestions) suggestions.style.display = 'none';

  addMsg(msg, true);
  conversationHistory.push({ role: 'user', content: msg });
  input.value = '';
  showTyping();

  try {
    var reply = await callAI(msg);
    conversationHistory.push({ role: 'assistant', content: reply });
    removeTyping();
    addMsg(formatAIResponse(reply), false);
  } catch (err) {
    removeTyping();
    var errorEl = addMsg('抱歉，请求出错了 😳<br><br><strong>错误信息：</strong>' + err.message + '<br><br>可能的原因：<br>• 网络连接问题<br>• AI 服务暂时不可用<br>• 请稍后重试', false);
    if (errorEl) {
      var errDiv = errorEl.querySelector('.msg-bubble');
      if (errDiv) errDiv.style.background = '#fcebeb';
    }
    conversationHistory.pop();
  }
}

async function callAI() {
  var sb = getAuthSupabase();
  if (!sb) throw new Error('系统未初始化');

  var sessionResult = await sb.auth.getSession();
  if (!sessionResult.data.session) throw new Error('登录已过期，请重新登录');
  currentSession = sessionResult.data.session;

  var response = await fetch(SUPABASE_URL + '/functions/v1/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + currentSession.access_token,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ messages: conversationHistory, itinerary_id: null }),
  });

  if (!response.ok) {
    var errData = await response.json().catch(function() { return {}; });
    throw new Error(errData.error || 'AI 服务异常 (' + response.status + ')');
  }

  var data = await response.json();
  return data.reply || 'AI 未返回内容';
}

function sendSuggestion(chip) {
  var text = chip.textContent.replace(/^[^\s]+\s/, '');
  var input = document.getElementById('chatInput');
  if (input) { input.value = text; sendMessage(); }
}

function handleKey(e) {
  if (e.key === 'Enter') sendMessage();
}

// ============================================================
// 行程管理
// ============================================================

async function saveItinerary(title, destination, days, budget, content) {
  var sb = getAuthSupabase();
  if (!sb || !currentUser) throw new Error('请先登录');
  var result = await sb.from('itineraries').insert({
    user_id: currentUser.id, title: title, destination: destination,
    days: days, budget: budget, content: content,
  }).select().single();
  if (result.error) throw result.error;
  return result.data;
}

async function loadItineraries() {
  var sb = getAuthSupabase();
  if (!sb || !currentUser) return [];
  var result = await sb.from('itineraries').select('*').order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}

async function deleteItinerary(id) {
  var sb = getAuthSupabase();
  if (!sb) throw new Error('未初始化');
  var result = await sb.from('itineraries').delete().eq('id', id);
  if (result.error) throw result.error;
}

// ============================================================
// INIT（auth.js 初始化完成后由回调触发）
// ============================================================
(function() {
  renderDestCards();
  // 如果已登录，初始化聊天
  if (currentUser) initChatAgent();
})();
