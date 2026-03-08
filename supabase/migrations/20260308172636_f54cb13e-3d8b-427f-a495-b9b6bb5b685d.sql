
-- Tighten competitions policies: only admins can insert/update/delete
DROP POLICY IF EXISTS "Authenticated users can insert competitions" ON public.competitions;
DROP POLICY IF EXISTS "Authenticated users can update competitions" ON public.competitions;
DROP POLICY IF EXISTS "Authenticated users can delete competitions" ON public.competitions;

CREATE POLICY "Admins can insert competitions" ON public.competitions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update competitions" ON public.competitions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete competitions" ON public.competitions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Generate slug function
CREATE OR REPLACE FUNCTION public.generate_competition_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_competition_slug
  BEFORE INSERT ON public.competitions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_competition_slug();
