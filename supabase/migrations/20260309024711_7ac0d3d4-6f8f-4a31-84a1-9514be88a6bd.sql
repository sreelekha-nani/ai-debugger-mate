
ALTER TABLE public.practice_submissions ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'python';
ALTER TABLE public.practice_submissions ADD COLUMN IF NOT EXISTS challenge_title TEXT;
