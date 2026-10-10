-- Texto das cartas (habilidades, ataques, fraqueza, recuo, regras…), em inglês, vindo do catálogo estático.
alter table public.cards add column if not exists card_text jsonb;
