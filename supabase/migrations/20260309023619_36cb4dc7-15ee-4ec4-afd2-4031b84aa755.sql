
CREATE TABLE public.quiz_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  language TEXT NOT NULL DEFAULT 'Python',
  question_type TEXT NOT NULL DEFAULT 'output_prediction',
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  is_correct BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own quiz submissions"
  ON public.quiz_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read quiz submissions"
  ON public.quiz_submissions FOR SELECT TO authenticated
  USING (true);
