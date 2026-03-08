DO $$
DECLARE
  r record;
  role_clause text;
  using_clause text;
  check_clause text;
  command_clause text;
  restrictive_count int;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND permissive = 'RESTRICTIVE'
  LOOP
    role_clause := CASE
      WHEN r.roles IS NULL OR array_length(r.roles, 1) IS NULL THEN 'TO PUBLIC'
      ELSE 'TO ' || array_to_string(
        ARRAY(
          SELECT quote_ident(role_name)
          FROM unnest(r.roles) AS role_name
        ),
        ', '
      )
    END;

    command_clause := CASE
      WHEN r.cmd = 'ALL' THEN 'FOR ALL'
      ELSE 'FOR ' || r.cmd
    END;

    using_clause := CASE
      WHEN r.qual IS NULL THEN ''
      ELSE ' USING (' || r.qual || ')'
    END;

    check_clause := CASE
      WHEN r.with_check IS NULL THEN ''
      ELSE ' WITH CHECK (' || r.with_check || ')'
    END;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I;',
      r.policyname,
      r.schemaname,
      r.tablename
    );

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS PERMISSIVE %s %s%s%s;',
      r.policyname,
      r.schemaname,
      r.tablename,
      command_clause,
      role_clause,
      using_clause,
      check_clause
    );
  END LOOP;

  SELECT count(*)
  INTO restrictive_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND permissive = 'RESTRICTIVE';

  IF restrictive_count > 0 THEN
    RAISE EXCEPTION 'RLS normalization failed: % restrictive policy/policies still exist in public schema', restrictive_count;
  END IF;
END
$$;