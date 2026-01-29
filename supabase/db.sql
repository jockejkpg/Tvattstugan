-- Tvättcykel-hanterare: schema + RLS + startdata

-- Personer / larmställ
create table if not exists people (
  id text primary key,                 -- "25", "27", "JE", "MO"
  next_step int not null default 1,    -- 1–6
  updated_at timestamptz default now()
);

-- Tvättlogg
create table if not exists wash_log (
  id uuid primary key default gen_random_uuid(),
  person_id text references people(id) on delete cascade,
  step int not null check (step between 1 and 6),
  done_by text not null,
  done_at timestamptz default now()
);

-- RLS (MVP: allow all)
alter table people enable row level security;
alter table wash_log enable row level security;

drop policy if exists "allow all" on people;
create policy "allow all"
on people for all
using (true)
with check (true);

drop policy if exists "allow all" on wash_log;
create policy "allow all"
on wash_log for all
using (true)
with check (true);

-- Startdata (kör bara om tomt)
insert into people (id)
select x.id from (values ('25'),('27'),('JE'),('MO')) as x(id)
where not exists (select 1 from people where people.id = x.id);
