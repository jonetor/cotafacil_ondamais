import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhscaxperxccigbbqzvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpoc2NheHBlcnhjY2lnYmJxenZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjI2MDIsImV4cCI6MjA3MTczODYwMn0.Wxwk4-D8WS0mZ4vlUTGBWxCxVQHbGZ24-6fCLTSJ7nA';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
