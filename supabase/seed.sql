insert into profiles (email, display_name, primary_role)
values
  ('coach@ironhq.app', 'Jean du Plessis', 'coach'),
  ('athlete1@ironhq.app', 'Mia Daniels', 'athlete'),
  ('athlete2@ironhq.app', 'Sam Mokoena', 'athlete')
on conflict (email) do nothing;

insert into clubs (name, slug)
values ('Demo Performance Club', 'demo-performance-club')
on conflict (slug) do nothing;
