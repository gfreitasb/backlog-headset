-- ===========================================================
-- Backlog de Chamados — Troca de Headset
-- Execute este script inteiro no Supabase: Project > SQL Editor > New query
-- ===========================================================

create extension if not exists "pgcrypto";

create table if not exists chamados (
  id            uuid primary key default gen_random_uuid(),
  numero        text not null default '',
  solicitante   text not null default '',
  tipo          text not null default 'Troca de Equipamento',
  pa            text not null default '',
  observacoes   text not null default '',
  status        text not null default 'pendente' check (status in ('pendente', 'resolvido')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Limites no banco: protegem tambem contra clientes que ignorem o HTML.
alter table public.chamados drop constraint if exists chamados_text_limits;
alter table public.chamados add constraint chamados_text_limits check (
  char_length(numero) <= 40 and
  char_length(solicitante) <= 120 and
  char_length(pa) <= 40 and
  char_length(observacoes) <= 1000
);

-- mantém updated_at sempre atual a cada edição
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_chamados_updated_at on chamados;
create trigger trg_chamados_updated_at
  before update on chamados
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------
-- Este é um app interno sem tela de login: liberamos leitura/escrita
-- para quem tiver a URL + chave anônima do projeto (a chave "anon" é
-- feita para ser usada no navegador, mas NÃO é secreta — qualquer um
-- com ela consegue ler e editar os dados, então não deixe o link do
-- projeto público). Se depois quiser exigir login, me avise que eu
-- adiciono Supabase Auth e troco essa policy para checar o usuário.
alter table public.chamados enable row level security;

drop policy if exists "allow all - app interno"
  on public.chamados;

drop policy if exists "authenticated users only"
  on public.chamados;

create policy "authenticated users only"
  on public.chamados
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

revoke all on table public.chamados from anon;
grant select, insert, update, delete
  on table public.chamados
  to authenticated;

-- A chave publishable fica visivel no navegador por design. O papel anonimo
-- nao deve acessar os chamados; somente sessoes autenticadas recebem privilegios.
revoke all on table public.chamados from anon;
grant select, insert, update, delete on table public.chamados to authenticated;

-- ---------------------------------------------------------
-- Dado de exemplo (apague depois de conferir que funcionou)
-- ---------------------------------------------------------
insert into chamados (numero, solicitante, tipo, pa, observacoes, status)
values ('0001', 'João Silva', 'Troca de Equipamento', 'PA-1023', 'Headset atual com defeito no microfone.', 'pendente');

-- ---------------------------------------------------------
-- Realtime: permite que a tabela emita eventos ao vivo
-- ---------------------------------------------------------
alter publication supabase_realtime add table chamados;
