"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

async function ensureUserInTable(supabase: ReturnType<typeof createSupabaseBrowser>) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return;

  // Get the selected organization from localStorage
  let selectedOrgId = null;
  if (typeof window !== 'undefined') {
    const selectedOrg = localStorage.getItem('selectedOrg');
    if (selectedOrg) {
      selectedOrgId = selectedOrg;
      localStorage.removeItem('selectedOrg');
    }
  }

  // If no organization was selected, get the first available one
  if (!selectedOrgId) {
    const { data: orgs, error: orgError } = await supabase
      .from("Organization")
      .select("id")
      .limit(1);
    if (orgError) return;
    selectedOrgId = orgs && orgs.length > 0 ? orgs[0].id : null;
  }
  if (!selectedOrgId) return;

  // Update the user's organizationId by email
  await supabase.from("User").update({
    organizationId: selectedOrgId,
  }).eq('email', user.email);

  // Insert if not found (will fail gracefully if already exists)
  await supabase.from("User").insert({
    id: user.id,
    email: user.email,
    role: "STUDENT",
    organizationId: selectedOrgId,
  });
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    let didRun = false;
    async function handleAuthCallback() {
      if (didRun) return;
      didRun = true;
      
      try {
        setLoading(true);
        
        // Wait a moment for auth to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(sessionError.message);
          setLoading(false);
          return;
        }
        
        if (session) {
          await ensureUserInTable(supabase);
          router.replace("/chat");
        } else {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            setError("No authenticated user found");
            setLoading(false);
            return;
          }
          
          await ensureUserInTable(supabase);
          router.replace("/chat");
        }
      } catch (err) {
        setError("An unexpected error occurred");
        setLoading(false);
      }
    }
    
    handleAuthCallback();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8 border border-yellow-200 text-center">
        <h1 className="text-2xl font-bold mb-6 text-yellow-600">
          {loading ? "Logging you in..." : "Authentication"}
        </h1>
        {error ? (
          <div className="space-y-4">
            <div className="text-red-600">{error}</div>
            <button
              onClick={() => router.push("/login")}
              className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-4 py-2 rounded transition"
            >
              Go to Login
            </button>
          </div>
        ) : loading ? (
          <div className="text-yellow-700">Please wait while we log you in...</div>
        ) : (
          <div className="text-green-600">Successfully logged in!</div>
        )}
      </div>
    </div>
  );
} 