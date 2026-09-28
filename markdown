# Lumera AI ✦

دستیار هوش مصنوعی مبتنی بر وب با Supabase و OpenAI

## راه‌اندازی

### ۱. Supabase
- SQL موجود در `sql/schema.sql` رو تو SQL Editor اجرا کن
- Authentication → Providers → Email رو فعال کن
- URL سایتت رو تو Authentication → URL Configuration اضافه کن

### ۲. Edge Function
```bash
supabase login
supabase link --project-ref xtyxorzyrzvzpwrtqnys
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy chat