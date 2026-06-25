alter table public.agendamentos
  add column if not exists "realizadoEm" timestamp with time zone,
  add column if not exists "realizadoPor" text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agendamentos_realizadoPor_fkey'
  ) then
    alter table public.agendamentos
      add constraint "agendamentos_realizadoPor_fkey"
      foreign key ("realizadoPor")
      references public.usuarios(id)
      on update cascade
      on delete set null;
  end if;
end $$;

with primeiro_realizado as (
  select distinct on ("entidadeId")
    "entidadeId" as "agendamentoId",
    "criadoEm" as "realizadoEm",
    "usuarioId" as "realizadoPor"
  from public.audit_logs
  where acao = 'marcar_atendimento_realizado'
    and entidade = 'Agendamento'
    and "entidadeId" is not null
  order by "entidadeId", "criadoEm" asc
)
update public.agendamentos a
set
  "realizadoEm" = coalesce(a."realizadoEm", pr."realizadoEm"),
  "realizadoPor" = coalesce(a."realizadoPor", pr."realizadoPor")
from primeiro_realizado pr
where a.id = pr."agendamentoId";
