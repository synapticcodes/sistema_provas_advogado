ALTER TABLE public.candidates
  ADD COLUMN ai_disabled boolean NOT NULL DEFAULT false;
