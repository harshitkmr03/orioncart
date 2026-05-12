-- Add CONSUMER to users_role_check constraint if it exists, or create a new permissive check.
DO $$
BEGIN
    -- If constraint exists, drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public' AND tc.table_name = 'users' AND tc.constraint_type = 'CHECK' AND tc.constraint_name = 'users_role_check'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    END IF;

    -- Create a new check constraint allowing the roles defined in the application enum
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check CHECK (role IN ('BUYER','SELLER','SHOPKEEPER','CONSUMER'));
EXCEPTION WHEN OTHERS THEN
    -- If anything fails (e.g., table doesn't exist), ignore so migration doesn't block environments where users table differs
    RAISE NOTICE 'V3__allow_consumer_role: ignored: %', SQLERRM;
END$$;
