alter function public.get_public_agenda(text,date) security invoker;
revoke all on function public.get_public_agenda(text,date) from public,anon;
grant execute on function public.get_public_agenda(text,date) to authenticated;
