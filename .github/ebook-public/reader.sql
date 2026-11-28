-- Prepare with the endpoint off; the edge function is the sole caller.
begin;
create or replace function public.book_free_online_reader(p_action text, p_sequence integer)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
declare
  chosen_slug constant text := 'the-right-way-to-live';
  release_count integer;
  data jsonb;
begin
  select expected_chapters into release_count
    from book_private.book_release
   where book_slug = chosen_slug and published is true and reviewed_at is not null;
  if release_count is null or release_count < 1 or release_count <> (
    select count(*) from book_private.book_chapters
     where book_slug = chosen_slug and length(btrim(body)) > 0
  ) then
    return null;
  end if;

  if p_action = 'contents' and p_sequence is null then
    select jsonb_build_object('chapters', jsonb_agg(jsonb_build_object(
      'sequence', sequence, 'title', title
    ) order by sequence)) into data
      from book_private.book_chapters where book_slug = chosen_slug;
  elsif p_action = 'chapter' and p_sequence > 0 then
    select jsonb_build_object('chapter', jsonb_build_object(
      'sequence', sequence, 'body', body
    )) into data
      from book_private.book_chapters
     where book_slug = chosen_slug and sequence = p_sequence;
  end if;
  return data;
end;
$$;
revoke all on function public.book_free_online_reader(text, integer) from public, anon, authenticated;
grant execute on function public.book_free_online_reader(text, integer) to service_role;
commit;
