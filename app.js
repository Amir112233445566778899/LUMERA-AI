import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://xtyxorzyrzvzpwrtqnys.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DALm5phLFNf8pf7q7Pl3Mg_KZPnwKAJ';
const OWNER_EMAIL = 'amiralihesamfar@gmail.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let currentConversationId = null;
let isSending = false;
let pendingEmail = '';
let isOwner = false;

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const otpForm = document.getElementById('otp-form');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');
const loginBtn = document.getElementById('login-btn');
const otpInput = document.getElementById('otp');
const otpError = document.getElementById('otp-error');
const verifyBtn = document.getElementById('verify-btn');
const backBtn = document.getElementById('back-btn');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');
const userGreeting = document.getElementById('user-greeting');

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

function extractNameFromEmail(email) {
  const local = email.split('@')[0];
  const cleaned = local.replace(/[._-]+/g, ' ').replace(/[0-9]+/g, '').trim().replace(/\s+/g, ' ');
  return cleaned || 'دوست عزیز';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  emailError.textContent = '';
  const email = emailInput.value.trim().toLowerCase();
  if (!isValidEmail(email)) {
    emailError.textContent = 'لطفاً یک ایمیل معتبر وارد کنید';
    return;
  }
  if (email === OWNER_EMAIL.toLowerCase()) {
    isOwner = true;
    currentUser = { id: 'owner-local', email: OWNER_EMAIL };
    currentProfile = { display_name: 'مالک', email: OWNER_EMAIL };
    localStorage.setItem('lumera_owner', 'true');
    showChatScreen();
    return;
  }
  loginBtn.disabled = true;
  loginBtn.querySelector('span').textContent = 'در حال ارسال...';
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { shouldCreateUser: true }
    });
    if (error) throw error;
    pendingEmail = email;
    loginForm.style.display = 'none';
    otpForm.style.display = 'block';
    otpInput.focus();
    otpError.style.color = '#4ade80';
    otpError.textContent = 'کد به ' + email + ' ارسال شد. ایمیلت رو چک کن.';
  } catch (err) {
    console.error(err);
    emailError.style.color = '#f87171';
    emailError.textContent = err.message || 'خطا در ارسال کد.';
    loginBtn.disabled = false;
    loginBtn.querySelector('span').textContent = 'ورود به Lumera';
  }
});

otpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  otpError.textContent = '';
  const token = otpInput.value.trim();
  if (token.length !== 6) {
    otpError.style.color = '#f87171';
    otpError.textContent = 'کد باید ۶ رقمی باشد';
    return;
  }
  verifyBtn.disabled = true;
  verifyBtn.querySelector('span').textContent = 'در حال تأیید...';
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: token,
      type: 'email'
    });
    if (error) throw error;
  } catch (err) {
    console.error(err);
    otpError.style.color = '#f87171';
    otpError.textContent = 'کد اشتباه یا منقضی شده.';
    verifyBtn.disabled = false;
    verifyBtn.querySelector('span').textContent = 'تأیید و ورود';
  }
});

backBtn.addEventListener('click', () => {
  otpForm.style.display = 'none';
  loginForm.style.display = 'block';
  loginBtn.disabled = false;
  loginBtn.querySelector('span').textContent = 'ورود به Lumera';
  otpInput.value = '';
  otpError.textContent = '';
});supabase.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    isOwner = false;
    await loadProfile();
    showChatScreen();
  } else if (!localStorage.getItem('lumera_owner')) {
    currentUser = null;
    currentProfile = null;
    isOwner = false;
    showLoginScreen();
  }
});

(async () => {
  if (localStorage.getItem('lumera_owner') === 'true') {
    isOwner = true;
    currentUser = { id: 'owner-local', email: OWNER_EMAIL };
    currentProfile = { display_name: 'مالک', email: OWNER_EMAIL };
    showChatScreen();
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (data && data.session && data.session.user) {
    currentUser = data.session.user;
    await loadProfile();
    showChatScreen();
  }
})();

async function loadProfile() {
  if (!currentUser) return;
  let result = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();
  let data = result.data;
  let error = result.error;
  if (error || !data) {
    const displayName = isOwner ? 'مالک' : extractNameFromEmail(currentUser.email);
    const insertResult = await supabase
      .from('profiles')
      .insert({
        id: currentUser.id,
        email: currentUser.email,
        display_name: displayName
      })
      .select()
      .maybeSingle();
    if (insertResult.error) {
      currentProfile = { display_name: displayName, email: currentUser.email };
    } else {
      currentProfile = insertResult.data || { display_name: displayName, email: currentUser.email };
    }
  } else {
    currentProfile = data;
  }
  const prefix = isOwner ? '👑 ' : '';
  userGreeting.textContent = prefix + 'سلام ' + currentProfile.display_name + ' 👋';
}

function showLoginScreen() {
  loginScreen.classList.add('active');
  chatScreen.classList.remove('active');
  otpForm.style.display = 'none';
  loginForm.style.display = 'block';
  emailInput.value = '';
  otpInput.value = '';
  loginBtn.disabled = false;
  loginBtn.querySelector('span').textContent = 'ورود به Lumera';
  verifyBtn.disabled = false;
  verifyBtn.querySelector('span').textContent = 'تأیید و ورود';
}

function showChatScreen() {
  loginScreen.classList.remove('active');
  chatScreen.classList.add('active');
  messagesEl.innerHTML = '';
  const name = currentProfile ? currentProfile.display_name : 'دوست عزیز';
  const greeting = isOwner
    ? '👑 سلام مالک عزیز ' + name + '! به Lumera خوش آمدی.'
    : 'سلام ' + name + '! من Lumera هستم. چطور می‌تونم کمکت کنم؟ 🌟';
  showSystemMessage(greeting);
  userInput.focus();
}

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = 'message ' + role;
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function showSystemMessage(text) {
  addMessage('system', text);
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.id = 'typing-indicator';
  div.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSending) return;
  const text = userInput.value.trim();
  if (!text) return;
  isSending = true;
  sendBtn.disabled = true;
  userInput.value = '';
  userInput.style.height = 'auto';
  addMessage('user', text);
  showTyping();
  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        message: text,
        userName: currentProfile ? currentProfile.display_name : 'کاربر',
        isOwner: isOwner
      }
    });
    removeTyping();
    if (error) throw error;
    const reply = (data && data.reply) ? data.reply : 'متأسفم، پاسخی دریافت نشد.';
    addMessage('assistant', reply);
  } catch (err) {
    console.error(err);
    removeTyping();
    addMessage('assistant', '⚠️ خطا در ارتباط با سرور. لطفاً دوباره تلاش کن.');
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});

userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

logoutBtn.addEventListener('click', async () => {
  localStorage.removeItem('lumera_owner');
  await supabase.auth.signOut();
  currentConversationId = null;
  isOwner = false;
  currentUser = null;
  currentProfile = null;
  showLoginScreen();
});
