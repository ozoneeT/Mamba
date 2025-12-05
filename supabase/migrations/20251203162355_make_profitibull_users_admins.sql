/*
  # Make specific users admins

  1. Changes
    - Update trigger to make profitibull.com users admins automatically
    - All other users become clients
  
  2. Security
    - Maintains existing RLS policies
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Make profitibull.com users admins, everyone else is a client
  IF NEW.email LIKE '%@profitibull.com' THEN
    user_role := 'admin';
  ELSE
    user_role := 'client';
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role
  );
  
  -- Admins get all accounts, clients get first account
  IF user_role = 'admin' THEN
    INSERT INTO public.user_accounts (user_id, account_id)
    SELECT NEW.id, id FROM accounts;
  ELSE
    INSERT INTO public.user_accounts (user_id, account_id)
    SELECT NEW.id, id FROM accounts ORDER BY created_at LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;