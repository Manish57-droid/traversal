import { supabaseServer } from "@/lib/supabase/server-client";
import LandingPage from "@/components/landing/LandingPage";

export default async function Page() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingPage userId={user?.id} />;
}
