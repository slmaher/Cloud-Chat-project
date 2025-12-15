"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data.session) {
      router.push("/chat");
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMagicSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8 border border-yellow-200">
        <h1 className="text-2xl font-bold mb-6 text-yellow-600 text-center">Sign in to Chat</h1>
        <form onSubmit={handleEmailPassword} className="space-y-4">
          <div>
            <label className="block text-yellow-700 mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-yellow-700 mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-2 rounded transition"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in with Email & Password"}
          </button>
        </form>
        <div className="my-4 flex items-center">
          <div className="flex-grow border-t border-yellow-200" />
          <span className="mx-2 text-yellow-500 text-sm">or</span>
          <div className="flex-grow border-t border-yellow-200" />
        </div>
        <form onSubmit={handleMagicLink} className="space-y-2">
          <button
            type="submit"
            className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-semibold py-2 rounded border border-yellow-300 transition"
            disabled={loading || !email}
          >
            {loading ? "Sending magic link..." : "Send Magic Link"}
          </button>
        </form>
        {magicSent && (
          <div className="mt-4 text-green-600 text-center text-sm">
            Magic link sent! Check your email.
          </div>
        )}
        {error && (
          <div className="mt-4 text-red-600 text-center text-sm">{error}</div>
        )}
      </div>
    </div>
  );
} 