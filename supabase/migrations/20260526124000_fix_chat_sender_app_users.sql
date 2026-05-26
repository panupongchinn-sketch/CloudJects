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
      and tc.table_name = 'chat_messages'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'sender_id'
  loop
    execute format(
      'alter table public.chat_messages drop constraint if exists %I',
      constraint_record.constraint_name
    );
  end loop;
end
$$;

update public.chat_messages
set sender_id = 'c82c072b-3ccb-48d5-b719-f450c8aa4ea3'::uuid
where project_id = 'c899f698-8bed-454b-8075-2a0390af0136'::uuid
  and id in (
    'c34193c5-bd77-4660-a4dc-72ac37314b89'::uuid,
    '865f8b3a-3012-4719-a10b-24130639b185'::uuid,
    '5781d5da-8a76-4c57-b815-c86f6d4e0235'::uuid
  );
