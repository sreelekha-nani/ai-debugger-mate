
-- Create admin_requests table
CREATE TABLE public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  UNIQUE(user_id, status)
);

ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own requests" ON public.admin_requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requests" ON public.admin_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can read all requests" ON public.admin_requests
FOR SELECT USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owner can update requests" ON public.admin_requests
FOR UPDATE USING (public.has_role(auth.uid(), 'owner'));

-- Create platform_settings table
CREATE TABLE public.platform_settings (
  id text PRIMARY KEY DEFAULT 'global',
  admin_access_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.platform_settings
FOR SELECT USING (true);

CREATE POLICY "Owner can update settings" ON public.platform_settings
FOR UPDATE USING (public.has_role(auth.uid(), 'owner'));

INSERT INTO public.platform_settings (id, admin_access_enabled) VALUES ('global', true);

-- Add streak fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_practice_date date;

-- Update auto_assign to assign 'owner' role to first user
CREATE OR REPLACE FUNCTION public.auto_assign_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;

-- Create function to update practice streak
CREATE OR REPLACE FUNCTION public.update_practice_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_date date;
  cur_streak integer;
  max_streak integer;
  today_date date := CURRENT_DATE;
BEGIN
  SELECT last_practice_date, current_streak, longest_streak
  INTO last_date, cur_streak, max_streak
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF last_date IS NULL OR last_date < today_date - 1 THEN
    cur_streak := 1;
  ELSIF last_date = today_date - 1 THEN
    cur_streak := cur_streak + 1;
  END IF;

  IF cur_streak > max_streak THEN
    max_streak := cur_streak;
  END IF;

  UPDATE public.profiles
  SET current_streak = cur_streak,
      longest_streak = max_streak,
      last_practice_date = today_date
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_streak_on_practice
AFTER INSERT ON public.practice_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_practice_streak();

-- Update has_role so owners pass admin checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR (_role = 'admin' AND role = 'owner'))
  )
$$;

-- Enable realtime for admin_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_requests;
