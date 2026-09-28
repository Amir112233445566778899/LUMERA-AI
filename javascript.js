import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// تنظیمات Supabase
// ============================================
const SUPABASE_URL = 'https://xtyxorzyrzvzpwrtqnys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0eXhvcnp5cnp2enB3cnRxbnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzkwMTUsImV4cCI6MjEwNTgxNTAxNX0.JaLT_49x517O5gtY9FrAJc3i5xFKjNy-CCyo7kML76I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// State
// ============================================
let currentUser = null;
let currentProfile = null;
let currentConversationId = null;
let isSending = false;

// ============================================
// Elements
// ============================================
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');
const loginBtn = document.getElementById('login-btn');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');
const userGreeting = document.getElementById('user-greeting');

// ============================================
// Helpers
// ============================================
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

function extractNameFromEmail(email) {
  const local = email.split('@')[0];
  const cleaned = local
    .replace(/[._-]+/g, ' ')
    .replace(/[0-9]+/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return cleaned || 'دوست عزیز';
}

// ============================================
// Login Flow
// ============================================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  emailError.textContent = '';

  const email = emailInput.value.trim().toLowerCase();

  if (!isValidEmail(email)) {
    emailError.textContent = 'لطفاً یک ایمیل معتبر وارد کنید';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.querySelector('span').textContent = 'در حال ورود...';

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) throw error;

    loginBtn.querySelector('span').textContent = 'ایمیل ارسال شد ✓';
    emailError.style.color = '#4ade80';
    emailError.textContent = `لینک ورود به ${email} ارسال شد. ایمیلت رو چک کن.`;
  } catch (err) {
    console.error(err);
    emailError.style.color = '#f87171';
    emailError.textContent = err.message || 'خطا در ورود. دوباره تلاش کن.';
    loginBtn.disabled = false;
    loginBtn.querySelector('span').textContent = 'ورود به Lumera';
  }
});

// ============================================
// Auth State
// ============================================
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    currentUser = session.user;
    await loadProfile();
    showChatScreen();
  } else {
    currentUser = null;
    currentProfile = null;
    showLoginScreen();
  }
});

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    await loadProfile();
    showChatScreen();
  }
})();

// ============================================
// Profile
// ============================================
async function loadProfile() {
  if (!currentUser) return;

  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error || !data) {
    const displayName = extractNameFromEmail(currentUser.email);
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: currentUser.id,
        email: currentUser.email,
        display_name: displayName,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Profile insert error:', insertError);
      currentProfile = { display_name: displayName, email: currentUser.email };
    } else {
      currentProfile = newProfile;
    }
  } else {
    currentProfile = data;
  }

  userGreeting.textContent = `سلام ${currentProfile.display_name} 👋`;
}

// ============================================
// Screens
// ============================================
function showLoginScreen() {
  loginScreen.classList.add('active');
  chatScreen.classList.remove('active');
}

function showChatScreen() {
  loginScreen.classList.remove('active');
  chatScreen.classList.add('active');

  messagesEl.innerHTML = '';
  const name = currentProfile?.display_name || 'دوست عزیز';
  showSystemMessage(`سلام ${name}! من Lumera هستم. چطور می‌تونم کمکت کنم؟ 🌟`);

  ensureConversation();
  userInput.focus();
}

// ============================================
// Conversation
// ============================================
async function ensureConversation() {
  if (currentConversationId) return currentConversationId;

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: currentUser.id,
      title: 'گفتگوی جدید',
    })
    .select()
    .single();

  if (error) {
    console.error('Conversation error:', error);
    return null;
  }

  currentConversationId = data.id;
  return currentConversationId;
}

// ============================================
// Messages UI
// ============================================
function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
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
  document.getElementById('typing-indicator')?.remove();
}

// ============================================
// Send Message
// ============================================
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSending) return;

  const text = userInput.value.trim();
  if (!text) return;

  isSending = true;
  sendBtn.disabled = true;
  userInput.value = '';
  userInput.style.height = 'auto';

  addMessage('user', text);

  const convId = await ensureConversation();
  if (convId) {
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: text,
    });
  }

  showTyping();

  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        message: text,
        conversationId: convId,
        userName: currentProfile?.display_name || 'کاربر',
      },
    });

    removeTyping();

    if (error) throw error;

    const reply = data?.reply || 'متأسفم، پاسخی دریافت نشد.';
    addMessage('assistant', reply);

    if (convId) {
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: reply,
      });
    }
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

// ============================================
// Textarea auto-resize
// ============================================
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

// ============================================
// Logout
// ============================================
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentConversationId = null;
});