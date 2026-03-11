CREATE TRIGGER on_practice_submission_update_streak
  AFTER INSERT ON public.practice_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_practice_streak();