
-- Add description and scheduled_end to competitions
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ;

-- Add DELETE policy for competitions (admin can delete)
CREATE POLICY "Authenticated users can delete competitions" ON public.competitions
  FOR DELETE TO authenticated
  USING (true);
