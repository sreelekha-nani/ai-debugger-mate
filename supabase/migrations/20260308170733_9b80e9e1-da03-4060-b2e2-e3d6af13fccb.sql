
-- Tighten participants policies to require auth
DROP POLICY IF EXISTS "Anyone can insert participants" ON public.participants;
DROP POLICY IF EXISTS "Anyone can update participants" ON public.participants;

-- Only authenticated users can insert participants (linking to their user_id)
CREATE POLICY "Authenticated users can insert participants" ON public.participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can update their own participant record
CREATE POLICY "Users can update own participant" ON public.participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Tighten competitions insert/update to authenticated only
DROP POLICY IF EXISTS "Anyone can insert competitions" ON public.competitions;
DROP POLICY IF EXISTS "Anyone can update competitions" ON public.competitions;

CREATE POLICY "Authenticated users can insert competitions" ON public.competitions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update competitions" ON public.competitions
  FOR UPDATE TO authenticated
  USING (true);
