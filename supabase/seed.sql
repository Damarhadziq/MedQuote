do $$
declare
  target_user uuid;
begin
  select id into target_user from auth.users order by created_at limit 1;

  if target_user is null then
    raise notice 'Buat minimal satu pengguna Supabase Auth sebelum menjalankan seed.';
    return;
  end if;

  if exists (select 1 from public.products where user_id = target_user) then
    raise notice 'Produk contoh dilewati karena pengguna sudah memiliki produk.';
    return;
  end if;

  insert into public.products
    (user_id, name, composition, package_type, package_detail, hna, tax_percentage)
  values
    (
      target_user,
      'Amoxicillin 500 mg',
      'Tiap kapsul mengandung Amoxicillin trihydrate setara Amoxicillin 500 mg',
      'Box',
      '10 strip × 10 kapsul',
      86500,
      11
    ),
    (
      target_user,
      'Omeprazole 20 mg',
      'Tiap kapsul mengandung Omeprazole 20 mg',
      'Box',
      '3 strip × 10 kapsul',
      42500,
      11
    ),
    (
      target_user,
      'Paracetamol Sirup',
      'Tiap 5 mL mengandung Paracetamol 120 mg',
      'Botol',
      '60 mL',
      18750,
      11
    ),
    (
      target_user,
      'Diclofenac Gel 1%',
      'Diclofenac sodium 1% dalam basis gel',
      'Tube',
      '20 gram',
      31200,
      11
    ),
    (
      target_user,
      'Cetirizine 10 mg',
      'Tiap tablet salut selaput mengandung Cetirizine HCl 10 mg',
      'Strip',
      '10 tablet',
      9750,
      11
    );
end
$$;
