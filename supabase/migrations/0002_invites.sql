-- Convites: só quem tem um código válido (criado por um administrador) pode registar-se.
create table if not exists public.invite_codes (
  code       text primary key,
  note       text not null default '',
  max_uses   int  not null default 1 check (max_uses >= 1),
  uses       int  not null default 0 check (uses >= 0),
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS ligado e SEM políticas: nenhum utilizador lê ou escreve estes códigos pela API pública.
-- Só o servidor (chave service_role, que ignora o RLS) lhes acede.
alter table public.invite_codes enable row level security;

-- Gasta um uso do código de forma atómica. Devolve true se o código era válido.
create or replace function public.consume_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  update invite_codes
     set uses = uses + 1
   where code = p_code
     and uses < max_uses
     and (expires_at is null or expires_at > now());
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

-- Devolve o uso se a criação da conta falhar a seguir.
create or replace function public.refund_invite(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update invite_codes set uses = greatest(uses - 1, 0) where code = p_code;
$$;

revoke all on function public.consume_invite(text) from public, anon, authenticated;
revoke all on function public.refund_invite(text)  from public, anon, authenticated;
grant execute on function public.consume_invite(text) to service_role;
grant execute on function public.refund_invite(text)  to service_role;
