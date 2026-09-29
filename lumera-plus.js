// ============================================
// Lumera Plus - سیستم محدودیت و اشتراک
// ============================================

const FREE_LIMIT = 1000;
const PLUS_PRICE = 300000;
const RESET_HOURS = 5;
const OWNER_EMAILS = ['amiralihesamfar@gmail.com'];

let _planData = null;
let _isPremium = false;
let _blockedTimer = null;

function _isOwnerEmail(email){
  return OWNER_EMAILS.includes(String(email||'').toLowerCase());
}

function _countWords(text){
  return String(text||'').trim().split(/\s+/).filter(Boolean).length;
}

async function _loadPlan(email){
  try{
    const { data } = await window._sb.from('lumera_plans').select('*').eq('email', email).maybeSingle();
    if(!data){
      await window._sb.from('lumera_plans').insert({ email: email, plan:'free', words_reset_at: new Date().toISOString() });
      return { plan:'free', words_used:0, words_reset_at: new Date().toISOString(), blocked_until: null };
    }
    if(data.plan_expires_at && new Date(data.plan_expires_at) < new Date() && data.plan !== 'owner'){
      await window._sb.from('lumera_plans').update({ plan:'free' }).eq('email', email);
      data.plan = 'free';
    }
    return data;
  }catch(e){
    return { plan:'free', words_used:0, words_reset_at: new Date().toISOString(), blocked_until: null };
  }
}

async function _resetIfNeeded(email, pd){
  if(_isPremium || pd.plan === 'owner' || pd.plan === 'plus' || pd.plan === 'plus_year') return pd;
  const now = new Date();
  const resetAt = new Date(pd.words_reset_at || now);
  const hoursPassed = (now - resetAt) / (1000*60*60);
  if(hoursPassed >= RESET_HOURS){
    await window._sb.from('lumera_plans').update({
      words_used: 0, words_reset_at: now.toISOString(), blocked_until: null
    }).eq('email', email);
    pd.words_used = 0;
    pd.words_reset_at = now.toISOString();
    pd.blocked_until = null;
  }
  return pd;
}

async function _addWords(email, count){
  if(_isPremium) return;
  if(!_planData) return;
  const newUsed = (_planData.words_used || 0) + count;
  const newTotal = (_planData.total_words_lifetime || 0) + count;
  const update = { words_used: newUsed, total_words_lifetime: newTotal, updated_at: new Date().toISOString() };
  if(newUsed >= FREE_LIMIT){
    update.blocked_until = new Date(Date.now() + RESET_HOURS*60*60*1000).toISOString();
  }
  await window._sb.from('lumera_plans').update(update).eq('email', email);
  _planData.words_used = newUsed;
  _planData.total_words_lifetime = newTotal;
  if(update.blocked_until) _planData.blocked_until = update.blocked_until;
  _updateUI();
}

function _updateUI(){
  const bar = document.getElementById('lumera-usage-fill');
  const txt = document.getElementById('lumera-status-text');
  const words = document.getElementById('lumera-status-words');
  const btn = document.getElementById('lumera-plus-btn');
  if(!bar) return;
  const premium = _isPremium || (_planData && (_planData.plan === 'owner' || _planData.plan === 'plus' || _planData.plan === 'plus_year'));
  if(premium){
    bar.style.width = '100%';
    bar.style.background = 'linear-gradient(90deg,#fbbf24,#f59e0b)';
    txt.textContent = '⚡ Plus فعال';
    words.textContent = 'بدون محدودیت';
    if(btn) btn.style.display = 'none';
    return;
  }
  if(btn) btn.style.display = '';
  const used = _planData ? (_planData.words_used || 0) : 0;
  const pct = Math.min(100, (used / FREE_LIMIT) * 100);
  bar.style.width = pct + '%';
  bar.style.background = pct > 80 ? 'linear-gradient(90deg,#f43f5e,#dc2626)' : (pct > 50 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : 'linear-gradient(90deg,#22d3ee,#a78bfa)');
  txt.textContent = 'وضعیت: رایگان';
  words.textContent = used + ' / ' + FREE_LIMIT + ' کلمه';
}

async function _initPlus(email){
  const owner = _isOwnerEmail(email);
  _isPremium = owner;
  _planData = await _loadPlan(email);
  if(_isPremium){
    _planData.plan = 'owner';
  } else {
    _planData = await _resetIfNeeded(email, _planData);
    if(_planData.plan === 'plus' || _planData.plan === 'plus_year'){
      _isPremium = true;
    }
  }
  _updateUI();
  if(_planData && _planData.blocked_until && new Date(_planData.blocked_until) > new Date() && !_isPremium){
    _showBlocked();
  }
}

function _showBlocked(){
  const el = document.getElementById('lumera-blocked');
  if(!el) return;
  el.style.display = 'flex';
  if(_blockedTimer) clearInterval(_blockedTimer);
  function tick(){
    const left = new Date(_planData.blocked_until) - new Date();
    if(left <= 0){
      clearInterval(_blockedTimer);
      el.style.display = 'none';
      return;
    }
    const h = Math.floor(left/3600000);
    const m = Math.floor((left%3600000)/60000);
    const s = Math.floor((left%60000)/1000);
    const timer = document.getElementById('lumera-blocked-timer');
    if(timer) timer.textContent = String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  tick();
  _blockedTimer = setInterval(tick, 1000);
}

function _openPlusModal(){
  const el = document.getElementById('lumera-plus-modal');
  if(el) el.style.display = 'flex';
}

function _closePlusModal(){
  const el = document.getElementById('lumera-plus-modal');
  if(el) el.style.display = 'none';
}

async function _applyDiscount(){
  const code = (document.getElementById('lumera-discount-input').value || '').trim().toUpperCase();
  const hint = document.getElementById('lumera-price-hint');
  if(!code){ hint.textContent = ''; return; }
  try{
    const { data } = await window._sb.from('lumera_discounts').select('*').eq('code', code).maybeSingle();
    if(!data){ hint.textContent = '❌ کد معتبر نیست'; hint.style.color = '#fca5a5'; return; }
    if(data.used_count >= data.max_uses){ hint.textContent = '❌ منقضی شده'; hint.style.color = '#fca5a5'; return; }
    const final = Math.round(PLUS_PRICE * (100 - data.percent) / 100);
    hint.textContent = '✓ تخفیف ' + data.percent + '% — قیمت نهایی: ' + final.toLocaleString('fa-IR') + ' تومان';
    hint.style.color = '#6ee7b7';
  }catch(e){ hint.textContent = ''; }
}

async function _requestPlus(){
  const code = (document.getElementById('lumera-discount-input').value || '').trim().toUpperCase();
  try{
    await window._sb.from('lumera_plus_requests').insert({
      email: window._currentUser ? window._currentUser.email : 'unknown',
      discount_code: code || null,
      original_price: PLUS_PRICE,
      final_price: PLUS_PRICE,
      status: 'pending'
    });
    alert('درخواست ثبت شد! به‌زودی با شما تماس می‌گیریم.');
    _closePlusModal();
  }catch(e){
    alert('خطا: ' + e.message);
  }
}

// ============================================
// Hook به توابع موجود
// ============================================
window._currentUser = null;

// ذخیره کاربر اصلی
const _origEnterApp = window.enterApp;
window.enterApp = async function(){
  if(_origEnterApp) await _origEnterApp();
  if(window.sessionUser){
    window._currentUser = window.sessionUser;
    await _initPlus(window.sessionUser.email);
  }
};

// چک قبل از ارسال پیام
const _origSendText = window.sendText;
window.sendText = async function(){
  const t = document.getElementById('prompt').value.trim();
  if(!t) return;
  if(!_isPremium && _planData && _planData.blocked_until && new Date(_planData.blocked_until) > new Date()){
    _showBlocked();
    return;
  }
  if(!_isPremium && _planData){
    const words = _countWords(t);
    if((_planData.words_used || 0) + words > FREE_LIMIT){
      _showBlocked();
      return;
    }
  }
  if(_origSendText) await _origSendText();
  if(!_isPremium && window.sessionUser && _planData){
    await _addWords(window.sessionUser.email, _countWords(t));
  }
};

// ============================================
// ساخت UI خودکار
// ============================================
document.addEventListener('DOMContentLoaded', function(){
  // نوار مصرف بالای صفحه
  const usageBar = document.createElement('div');
  usageBar.id = 'lumera-usage-bar';
  usageBar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;background:transparent;z-index:80;pointer-events:none';
  usageBar.innerHTML = '<div id="lumera-usage-fill" style="height:100%;width:0%;transition:width .5s"></div>';
  document.body.appendChild(usageBar);

  // کارت وضعیت + دکمه Plus (بالای چت)
  const app = document.getElementById('app');
  if(app){
    const statusCard = document.createElement('div');
    statusCard.className = 'glass px-4 py-2 text-xs flex items-center justify-between';
    statusCard.style.color = 'var(--muted)';
    statusCard.innerHTML = '<span id="lumera-status-text">وضعیت: رایگان</span><span id="lumera-status-words">0 / 1000 کلمه</span>';
    const header = app.querySelector('header');
    if(header && header.nextSibling){
      app.insertBefore(statusCard, header.nextSibling);
    }
  }

  // دکمه Plus طلایی توی هدر
  const header = document.querySelector('#app header .flex.gap-2');
  if(header){
    const plusBtn = document.createElement('button');
    plusBtn.id = 'lumera-plus-btn';
    plusBtn.className = 'btn btn-ghost text-xs';
    plusBtn.style.cssText = 'background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1c1917;font-weight:800;box-shadow:0 4px 20px rgba(251,191,36,.4)';
    plusBtn.textContent = '⚡ ارتقا به Plus';
    plusBtn.onclick = _openPlusModal;
    header.insertBefore(plusBtn, header.firstChild);
  }

  // مودال Plus
  const plusModal = document.createElement('div');
  plusModal.id = 'lumera-plus-modal';
  plusModal.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.8);display:none;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
  plusModal.innerHTML = `
    <div class="glass" style="max-width:480px;width:100%;padding:24px;border-radius:20px">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:32px">⚡</div>
        <h2 style="font-weight:900;font-size:24px;background:linear-gradient(135deg,#fbbf24,#f59e0b);-webkit-background-clip:text;background-clip:text;color:transparent">Lumera Plus</h2>
        <p style="font-size:12px;color:var(--muted);margin-top:4px">تجربه بی‌محدود هوش مصنوعی</p>
      </div>
      <div class="glass" style="padding:16px;text-align:center;margin-bottom:12px">
        <div style="font-size:28px;font-weight:900;color:#fbbf24">۳۰۰,۰۰۰</div>
        <div style="font-size:12px;color:var(--muted)">تومان / ماهانه</div>
      </div>
      <div style="font-size:14px;margin-bottom:16px;line-height:2">
        <div>✓ بدون محدودیت کلمه</div>
        <div>✓ همه مدل‌های AI</div>
        <div>✓ تولید تصویر نامحدود</div>
        <div>✓ تولید ویدیو</div>
        <div>✓ کلون صوتی</div>
        <div>✓ پشتیبانی ۲۴/۷</div>
      </div>
      <input id="lumera-discount-input" class="input" placeholder="کد تخفیف (اختیاری)" oninput="_applyDiscount()" style="margin-bottom:8px"/>
      <p id="lumera-price-hint" style="font-size:12px;color:var(--muted);min-height:18px;margin-bottom:12px"></p>
      <button class="btn btn-primary" style="width:100%;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1c1917" onclick="_requestPlus()">💳 پرداخت و فعال‌سازی</button>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="_closePlusModal()">بستن</button>
    </div>
  `;
  document.body.appendChild(plusModal);

  // مودال بلاک
  const blockedModal = document.createElement('div');
  blockedModal.id = 'lumera-blocked';
  blockedModal.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;padding:16px';
  blockedModal.innerHTML = `
    <div class="glass" style="max-width:400px;width:100%;padding:24px;text-align:center;border-radius:20px">
      <div style="font-size:48px;margin-bottom:12px">⏳</div>
      <h2 style="font-weight:800;font-size:20px;margin-bottom:8px">محدودیت موقت</h2>
      <p style="font-size:14px;color:var(--muted);margin-bottom:12px">به سقف ۱۰۰۰ کلمه در ۵ ساعت رسیدی</p>
      <div id="lumera-blocked-timer" style="font-size:24px;font-weight:800;color:#fbbf24;margin-bottom:16px">--:--:--</div>
      <button class="btn" style="width:100%;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1c1917;font-weight:800;margin-bottom:8px" onclick="document.getElementById('lumera-blocked').style.display='none';_openPlusModal()">⚡ ارتقا به Plus</button>
      <button class="btn btn-ghost" style="width:100%" onclick="document.getElementById('lumera-blocked').style.display='none'">بستن</button>
    </div>
  `;
  document.body.appendChild(blockedModal);
});
