begin;

create or replace function public.guard_compliance()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  annual_total numeric(12,2);
begin
  if tg_table_name in ('leagues', 'tournaments', 'players') then
    if new.country_code = 'TR' then
      raise exception 'ALCL community tournaments are unavailable in Turkey'
        using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'community_supporters' then
    if exists (
      select 1 from public.prohibited_supporter_categories p
      where p.slug = new.category and p.active
    ) then
      raise exception 'Supporter category % is prohibited', new.category
        using errcode = '23514';
    end if;
    select coalesce(sum(s.annual_non_cash_value_usd), 0)
      into annual_total
      from public.community_supporters s
      where extract(year from s.starts_on) = extract(year from new.starts_on)
        and s.id is distinct from new.id;
    if annual_total + new.annual_non_cash_value_usd > 10000 then
      raise exception 'Annual community prize/support value exceeds USD 10,000'
        using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'prizes' then
    if new.kind <> 'non_cash' or new.cash_value_usd <> 0 then
      raise exception 'Cash prizes are disabled in community mode'
        using errcode = '23514';
    end if;
    select coalesce(sum(p.fair_market_value_usd), 0)
      into annual_total
      from public.prizes p
      where extract(year from coalesce(p.awarded_at, p.created_at)) =
            extract(year from coalesce(new.awarded_at, new.created_at))
        and p.id is distinct from new.id;
    if annual_total + new.fair_market_value_usd > 10000 then
      raise exception 'Annual prize fair-market value exceeds USD 10,000'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

alter table public.tournaments
  drop column if exists entry_fee_usd;

alter table public.compliance_settings
  drop column if exists entry_fee_usd;

commit;
