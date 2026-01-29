-- Tvättcykel-hanterare v2: schema + startdata
-- Cykel: 1-4 VANLIGT, 5 IMPREGNERING

create table if not exists people (
  id text primary key,
  next_step int not null default 1,
  updated_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text,
  created_at timestamptz default now()
);

create table if not exists wash_log (
  id uuid primary key default gen_random_uuid(),
  person_id text references people(id) on delete cascade,
  step int not null check (step between 1 and 5),
  done_by text not null,
  done_at timestamptz default now()
);

-- MVP: öppna policies för anon/publishable key
alter table people enable row level security;
alter table users enable row level security;
alter table wash_log enable row level security;

drop policy if exists "allow all" on people;
create policy "allow all" on people for all using (true) with check (true);

drop policy if exists "allow all" on users;
create policy "allow all" on users for all using (true) with check (true);

drop policy if exists "allow all" on wash_log;
create policy "allow all" on wash_log for all using (true) with check (true);

-- Startdata
insert into people (id, next_step)
select x.id, 1 from (values ('25'),('27'),('JE'),('MO')) as x(id)
where not exists (select 1 from people where people.id = x.id);

insert into users (code, name)
select x.code, x.name from (values ('JE','JE'), ('MO','MO')) as x(code,name)
where not exists (select 1 from users where users.code = x.code);
