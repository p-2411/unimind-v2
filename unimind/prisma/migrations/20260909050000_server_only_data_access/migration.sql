-- Application data is accessed through authenticated tRPC with Prisma, never
-- directly through Supabase's browser Data API. No client-role policies exist.
-- The backend database owner retains access; browser roles must not bypass tRPC.
DO $$
DECLARE
  table_name text;
  client_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'user_stats', 'user_topics', 'user_courses', 'user_questions',
    'question_attempts', 'question_answer_receipts', 'courses', 'topics',
    'subtopics', 'questions', 'assessments', '_AssessmentToUser',
    'achievements', 'user_achievements', 'analytics_events', '_prisma_migrations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      -- Standalone PostgreSQL test databases do not have Supabase roles.
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, client_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
