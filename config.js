// ===========================================================
// Configuração de conexão com o Supabase
// ===========================================================
// Onde encontrar esses valores:
//   Supabase > seu projeto > Project Settings (ícone de engrenagem) > API
//   - Project URL          -> cole em SUPABASE_URL
//   - Project API keys > anon public -> cole em SUPABASE_ANON_KEY
//
// A chave "anon" é pública por design (protegida pelas regras RLS
// que criamos no supabase-schema.sql), então tudo bem ela ir junto
// no código que sobe pra Vercel.
// ===========================================================

const SUPABASE_URL = "https://iknfdifgtdbitbzpnhvs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YRRbtJvNxi9otqgk0kvDEg_ZzIEfayI";
