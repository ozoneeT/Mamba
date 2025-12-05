/*
  # Auto-assign accounts to new users

  1. Changes
    - Update trigger to auto-assign accounts
    - Admins get access to all accounts
    - New clients get assigned to first available account for demo
  
  2. Security
    - Maintains existing RLS policies
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count INTEGER;
  user_role TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  user_role := CASE WHEN user_count = 0 THEN 'admin' ELSE 'client' END;
  
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role
  );
  
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