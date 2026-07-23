do $$
declare
  target_user uuid;
begin
  select id into target_user from auth.users order by created_at limit 1;

  if target_user is null then
    raise notice 'Buat minimal satu pengguna Supabase Auth sebelum menjalankan seed.';
    return;
  end if;

  insert into public.products
    (user_id, name, composition, package_type, package_detail, hna, tax_percentage)
  select
    target_user,
    product.name,
    product.composition,
    product.package_type,
    product.package_detail,
    product.hna,
    11
  from (
    values
      ('Amlodipine 10 mg', 'Amlodipine 10 mg / tablet', 'Box', '30''s', 31475),
      ('Amlodipine 5 mg', 'Amlodipine 5 mg / tablet', 'Box', '30''s', 17850),
      ('Astaxanthin Natural MPL 4 mg', 'Haematococcus pluvialis extract 200 mg (Astaxanthin 4 mg) / kapsul', 'Box', '18''s', 107075),
      ('Azithromycin Dihydrate 500 mg', 'Azithromycin 500 mg / kaplet', 'Box', '20''s', 90000),
      ('Azovir Cream', 'Acyclovir 5% / tube', 'Tube', '5 gr', 19600),
      ('Bidicef 500 mg', 'Cefadroxil 500 mg / kapsul', 'Box', '60''s', 270375),
      ('Bidicef DS', 'Cefadroxil 125 mg / 5 ml', 'Botol', '60 ml', 33990),
      ('Biocort Cream 10 g', 'Gentamicin 0.1%, Betamethasone 0.1% / 10 gr / tube', 'Tube', '10 g', 33775),
      ('Biocort Cream 5 g', 'Gentamicin 0.1%, Betamethasone 0.1% / 5 gr / tube', 'Tube', '5 g', 22275),
      ('Cefadroxil 500 mg', 'Cefadroxil 500 mg / kapsul', 'Box', '100''s', 100000),
      ('Cefixime 100 mg (Box 50''s)', 'Cefixime Trihydrate 100 mg / kapsul', 'Box', '50''s', 110000),
      ('Cefixime 100 mg (Box 100''s)', 'Cefixime Trihydrate 100 mg / kapsul', 'Box', '100''s', 220000),
      ('Cindala Gel 10 g', 'Clindamycin phosphate 1% / tube', 'Tube', '10 g', 28675),
      ('Citicoline MPL 500 mg', 'Citicoline 500 mg / tablet', 'Box', '30''s', 254775),
      ('Dermabiotik Cream 10 g', 'Gentamicin 0.1% / 10 g / tube', 'Tube', '10 g', 14925),
      ('Diclofenac Potassium 50 mg', 'Kalium Diklofenak 50 mg / tablet', 'Box', '50''s', 46200),
      ('Domperidone 10 mg', 'Domperidone 10 mg / tablet', 'Box', '100''s', 39900),
      ('Echinacea MPL 500 mg', 'Echinacea purpurea herba ekstrak 500 mg / kaplet', 'Box', '30''s', 80075),
      ('Eperisone 50 mg', 'Eperisone HCl 50 mg / tablet', 'Box', '100''s', 173775),
      ('Fenofibrate 200M', 'Fenofibrate micronized 200 mg / kapsul', 'Box', '40''s', 201200),
      ('Gingkan', 'Ext. Gingko Biloba 40 mg / tablet', 'Box', '100''s', 257500),
      ('Glucosamine MPL 250 mg', 'Glucosamine 250 mg / tablet', 'Box', '100''s', 112500),
      ('Glucosamine MPL 500 mg', 'Glucosamine 500 mg / kaplet', 'Box', '100''s', 178000),
      ('Glucosamine MPL Plus', 'Glucosamine 500 mg dan Chondroitin 250 mg / kaplet', 'Box', '30''s', 126300),
      ('Linco MPL 500 mg', 'Lincomycin 500 mg / kapsul', 'Box', '100''s', 373900),
      ('Methylprednisolone 4 mg', 'Methylprednisolone 4 mg / tablet', 'Box', '100''s', 51150),
      ('Medirol 4 mg', 'Methylprednisolone 4 mg / tablet', 'Box', '100''s', 167275),
      ('Mevrabal 500 mcg', 'Mecobalamin 500 mcg / kapsul', 'Box', '100''s', 147300),
      ('Mucotussan Sirup 100 ml', '0,7 gr ekstrak kering Hedera Helix Folium (dried Ivy leaf extract) / 100 ml', 'Botol', '100 ml', 44000),
      ('Polacel Syrup 60 ml', 'Dexchlorpheniramine maleate 2 mg, Betamethasone 0.25 mg / 5 ml', 'Botol', '60 ml', 34775),
      ('Polacel Tablet', 'Dexchlorpheniramine maleate 2 mg, Betamethasone 0.25 mg / tablet', 'Box', '100''s', 133575),
      ('Terasma Expec. Syr 60 ml', 'Terbutaline sulphate 1.5 mg, Guaifenesin 50 mg / 5 ml', 'Botol', '60 ml', 18325),
      ('Terasma Tablet 2.5 mg', 'Terbutaline sulphate 2.5 mg / tablet', 'Box', '100''s', 83600),
      ('Tupepe Skin Repair Cream 30 g', 'Urea 10%, Aloe Vera, Dimethicone / tube', 'Tube', '30 gr', 22325),
      ('Vitamin C MPL 500 mg', 'Asam Askorbat 500 mg / kaplet', 'Box', '100''s', 125000),
      ('Vitamin D3 MPL 1000 IU', 'Vitamin D3 1000 IU / tablet', 'Box', '100''s', 68250),
      ('Zoralin Cream', 'Ketoconazole 2% / tube', 'Tube', '10 g', 21500),
      ('Zoralin Tab 200 mg', 'Ketoconazole 200 mg / tablet', 'Box', '100''s', 287400)
  ) as product(name, composition, package_type, package_detail, hna)
  where not exists (
    select 1
    from public.products existing
    where existing.user_id = target_user
      and lower(existing.name) = lower(product.name)
  );
end
$$;
