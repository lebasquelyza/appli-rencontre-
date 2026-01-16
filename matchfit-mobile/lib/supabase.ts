import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vnzlovsnxxoacvjaekjv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuemxvdnNueHhvYWN2amFla2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzM3MzUsImV4cCI6MjA4Mjk0OTczNX0.MvDuRzqT-t1hyzEKJ4QNvkrlOmVpiG-f9z9IXUd98k0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
