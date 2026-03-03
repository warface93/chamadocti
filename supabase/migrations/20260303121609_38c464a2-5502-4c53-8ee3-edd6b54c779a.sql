
-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meeting_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT NOT NULL,
  other_description TEXT,
  status TEXT NOT NULL DEFAULT 'em_uso',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting_equipment table (user's equipment selections)
CREATE TABLE public.meeting_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  equipment TEXT NOT NULL
);

-- Create meeting_admin_items table (admin's equipment lending records)
CREATE TABLE public.meeting_admin_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  tombamento TEXT
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_admin_items ENABLE ROW LEVEL SECURITY;

-- RLS for meetings
CREATE POLICY "Users can view own meetings, admins can view all"
  ON public.meetings FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can create meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update meetings"
  ON public.meetings FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete meetings"
  ON public.meetings FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS for meeting_equipment
CREATE POLICY "Users can view equipment of accessible meetings"
  ON public.meeting_equipment FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_id AND (m.user_id = auth.uid() OR is_admin(auth.uid()))
  ));

CREATE POLICY "Users can insert equipment for own meetings"
  ON public.meeting_equipment FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_id AND m.user_id = auth.uid()
  ));

-- RLS for meeting_admin_items
CREATE POLICY "Admins can manage admin items"
  ON public.meeting_admin_items FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view admin items for own meetings"
  ON public.meeting_admin_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_id AND m.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
