/*
  # Fix new user trigger

  1. Changes
    - Add better error handling
    - Use ON CONFLICT to prevent duplicate entries
    - Make account assignment more robust
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
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign accounts
  IF user_role = 'admin' THEN
    -- Admins get all accounts
    INSERT INTO public.user_accounts (user_id, account_id)
    SELECT NEW.id, id FROM accounts
    ON CONFLICT (user_id, account_id) DO NOTHING;
  ELSE
    -- Clients get first account
    INSERT INTO public.user_accounts (user_id, account_id)
    SELECT NEW.id, id FROM accounts ORDER BY created_at LIMIT 1
    ON CONFLICT (user_id, account_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;