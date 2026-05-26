do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_schema = kcu.constraint_schema
     and tc.constraint_name = kcu.constraint_name
    where tc.constraint_schema = 'public'
      and tc.table_name = 'project_members'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'user_id'
  loop
    execute format(
      'alter table public.project_members drop constraint if exists %I',
      constraint_record.constraint_name
    );
  end loop;
end
$$;
