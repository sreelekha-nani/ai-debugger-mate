
-- Competitions table
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Bug Busters Challenge',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  duration INTEGER NOT NULL DEFAULT 900,
  challenge_data JSONB,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended')),
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  admin_password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  team TEXT DEFAULT 'Solo',
  warnings INTEGER NOT NULL DEFAULT 0,
  warning_details JSONB DEFAULT '[]'::jsonb,
  disqualified BOOLEAN NOT NULL DEFAULT false,
  webcam_active BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted BOOLEAN NOT NULL DEFAULT false,
  code TEXT,
  score INTEGER DEFAULT 0,
  bugs_fixed INTEGER DEFAULT 0,
  total_bugs INTEGER DEFAULT 0,
  accuracy NUMERIC DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Public read for competitions (anyone can see active competitions)
CREATE POLICY "Anyone can read competitions" ON public.competitions FOR SELECT USING (true);
-- Anyone can insert competitions (admin creates via password)
CREATE POLICY "Anyone can insert competitions" ON public.competitions FOR INSERT WITH CHECK (true);
-- Anyone can update competitions
CREATE POLICY "Anyone can update competitions" ON public.competitions FOR UPDATE USING (true);

-- Anyone can read participants
CREATE POLICY "Anyone can read participants" ON public.participants FOR SELECT USING (true);
-- Anyone can insert participants
CREATE POLICY "Anyone can insert participants" ON public.participants FOR INSERT WITH CHECK (true);
-- Anyone can update their own participant record
CREATE POLICY "Anyone can update participants" ON public.participants FOR UPDATE USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
