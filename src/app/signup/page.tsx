"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createSupabaseBrowser();

  // Organization options - these IDs should match what's in your database
  const organizations = [
    { id: "org-a-uuid-0000-0000-000000000001", name: "Organization A" },
    { id: "org-b-uuid-0000-0000-000000000002", name: "Organization B" },
  ];

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedOrg) {
      setError("Please select an organization");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Store the selected organization in localStorage for the trigger to use
      localStorage.setItem("selectedOrg", selectedOrg);
      console.log("Selected org for signup:", selectedOrg);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        setSuccess(true);
        setEmail("");
        setPassword("");
        setSelectedOrg("");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8 border border-yellow-200">
        <h1 className="text-2xl font-bold mb-6 text-yellow-600 text-center">
          Sign Up
        </h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-yellow-700 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-yellow-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label
              className="block text-yellow-700 mb-1"
              htmlFor="organization"
            >
              Select Organization
            </label>
            <select
              id="organization"
              className="w-full px-3 py-2 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 "
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              required
            >
              <option value="">Choose an organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-2 rounded transition"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        {success && (
          <div className="mt-4 text-green-600 text-center text-sm">
            Signup successful! Please check your email to confirm your account.
          </div>
        )}
        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-yellow-600 hover:underline text-sm"
          >
            Already have an account? Log in
          </Link>
        </div>
        {error && (
          <div className="mt-4 text-red-600 text-center text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}
