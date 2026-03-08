
-- Create admin role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add slug column to competitions for unique URLs
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create practice_submissions table
CREATE TABLE public.practice_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  score INTEGER DEFAULT 0,
  bugs_fixed INTEGER DEFAULT 0,
  total_bugs INTEGER DEFAULT 0,
  accuracy NUMERIC DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read practice submissions" ON public.practice_submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own practice submissions" ON public.practice_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add unique constraint: one user per competition
ALTER TABLE public.participants ADD CONSTRAINT participants_user_competition_unique UNIQUE (user_id, competition_id);
