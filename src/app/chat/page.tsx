"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: {
    email: string;
  };
}

interface UserInfo {
  organizationId: string;
  organization: {
    name: string;
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  useEffect(() => {
    async function fetchMessages() {
      setError(null);
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // Fetch the user's row to get organizationId
      let { data: userRow, error: userRowError } = await supabase
        .from("User")
        .select("organizationId")
        .eq("id", user.id)
        .single();

      // If user doesn't exist in User table, create them
      if (userRowError || !userRow) {
        // Get the first available organization
        const { data: orgs, error: orgError } = await supabase
          .from("Organization")
          .select("id")
          .limit(1);

        if (orgError || !orgs || orgs.length === 0) {
          setError("No organizations available.");
          setLoading(false);
          return;
        }

        const organizationId = orgs[0].id;

        // Create the user
        const { error: insertError } = await supabase.from("User").insert({
          id: user.id,
          email: user.email,
          role: "STUDENT",
          organizationId: organizationId,
        });

        if (insertError) {
          if (insertError.code === '23505') {
            // User already exists, try to fetch again
            const { data: retryUserRow, error: retryError } = await supabase
              .from("User")
              .select("organizationId")
              .eq("id", user.id)
              .single();
            
            if (retryError || !retryUserRow) {
              setError("Could not find user organization.");
              setLoading(false);
              return;
            }
            userRow = retryUserRow;
          } else {
            setError("Failed to create user: " + insertError.message);
            setLoading(false);
            return;
          }
        } else {
          // Fetch the newly created user
          const { data: newUserRow, error: newUserError } = await supabase
            .from("User")
            .select("organizationId")
            .eq("id", user.id)
            .single();
          
          if (newUserError || !newUserRow) {
            setError("Could not find newly created user.");
            setLoading(false);
            return;
          }
          userRow = newUserRow;
        }
      }

      // Fetch the organization name
      const { data: orgData, error: orgError } = await supabase
        .from("Organization")
        .select("name")
        .eq("id", userRow.organizationId)
        .single();

      if (orgError || !orgData) {
        setError("Could not find organization.");
        setLoading(false);
        return;
      }

      setUserInfo({
        organizationId: userRow.organizationId,
        organization: { name: orgData.name }
      });

      // Now fetch messages for the user's organization
      const { data, error } = await supabase
        .from("Message")
        .select("*, user:User(email)")
        .eq("organizationId", userRow.organizationId)
        .order("createdAt", { ascending: true });

      setLoading(false);

      if (error) {
        setError(error.message);
      } else {
        // Transform the data to handle AI bot messages
        const transformedMessages = (data || []).map(msg => ({
          ...msg,
          userId: msg.userId,
          user: msg.userId === '00000000-0000-0000-0000-00000000a1b0' ? null : msg.user
        }));
        setMessages(transformedMessages);
      }
    }

    fetchMessages();
  }, [router, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Send the message to the /api/relay endpoint
      const res = await fetch("/api/relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: input }),
      });

      setLoading(false);

      if (!res.ok) {
        const errorJson = await res.json();
        setError(errorJson.error || "Failed to send message");
        return;
      }

      setInput("");

      // Insert AI bot message immediately from the frontend
      if (userInfo?.organizationId) {
        const aiUserId =
          userInfo.organizationId === 'org-a-uuid-0000-0000-000000000001'
            ? 'ai-bot-org-a-uuid'
            : userInfo.organizationId === 'org-b-uuid-0000-0000-000000000002'
            ? 'ai-bot-org-b-uuid'
            : undefined;
        if (aiUserId) {
          await supabase.from("Message").insert({
            id: crypto.randomUUID(),
            content: `AI response to: ${input}`,
            userId: aiUserId,
            organizationId: userInfo.organizationId,
          });
        }
      }

      // Re-fetch messages from the database
      const {
        data: { user: refreshedUser },
      } = await supabase.auth.getUser();

      if (!refreshedUser) {
        setError("User not found. Please log in again.");
        setLoading(false);
        router.push("/login");
        return;
      }

      let { data: refreshedUserRow } = await supabase
        .from("User")
        .select("organizationId")
        .eq("id", refreshedUser.id)
        .single();

      // If user doesn't exist, create them
      if (!refreshedUserRow) {
        // Get the first available organization
        const { data: orgs, error: orgError } = await supabase
          .from("Organization")
          .select("id")
          .limit(1);

        if (orgError || !orgs || orgs.length === 0) {
          setError("No organizations available.");
          setLoading(false);
          return;
        }

        const organizationId = orgs[0].id;

        // Create the user
        const { error: insertError } = await supabase.from("User").insert({
          id: refreshedUser.id,
          email: refreshedUser.email,
          role: "STUDENT",
          organizationId: organizationId,
        });

        if (insertError) {
          if (insertError.code === '23505') {
            // User already exists, try to fetch again
            const { data: retryUserRow } = await supabase
              .from("User")
              .select("organizationId")
              .eq("id", refreshedUser.id)
              .single();
            refreshedUserRow = retryUserRow;
          } else {
            setError("Failed to create user: " + insertError.message);
            setLoading(false);
            return;
          }
        } else {
          // Fetch the newly created user
          const { data: newUserRow } = await supabase
            .from("User")
            .select("organizationId")
            .eq("id", refreshedUser.id)
            .single();
          refreshedUserRow = newUserRow;
        }
      }

      if (!refreshedUserRow) {
        setError("Could not find user organization.");
        setLoading(false);
        return;
      }

      const { data: refreshedMessages } = await supabase
        .from("Message")
        .select("*, user:User(email)")
        .eq("organizationId", refreshedUserRow.organizationId)
        .order("createdAt", { ascending: true });

      // Transform the data to handle AI bot messages
      const transformedMessages = (refreshedMessages || []).map(msg => ({
        ...msg,
        userId: msg.userId,
        user: msg.userId === '00000000-0000-0000-0000-00000000a1b0' ? null : msg.user
      }));
      setMessages(transformedMessages);
    } catch (err) {
      setLoading(false);
      setError("Network error: " + (err as Error).message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6 border border-yellow-200 flex flex-col h-[80vh]">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-yellow-600">Organization Chat</h1>
          {userInfo && (
            <p className="text-sm text-yellow-700 mt-1">
              You are in: <span className="font-semibold">{userInfo.organization.name}</span>
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto mb-4 px-2" style={{ minHeight: 0 }}>
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-yellow-400 text-center">No messages yet.</div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                {(msg.userId === "ai-bot-org-a-uuid" || msg.userId === "ai-bot-org-b-uuid") ? (
                  <span className="text-sm text-purple-700 font-extrabold italic tracking-wide">🤖 AI Bot</span>
                ) : (
                  <span className="text-sm text-yellow-700 font-semibold">{msg.user?.email || "Unknown"}</span>
                )}
                <span className={
                  (msg.userId === "ai-bot-org-a-uuid" || msg.userId === "ai-bot-org-b-uuid")
                    ? "bg-purple-200 border-l-4 border-purple-500 rounded px-4 py-3 text-purple-600 mt-1 w-fit max-w-[80%] shadow-md"
                    : "bg-yellow-100 rounded px-3 py-2 text-yellow-900 mt-1 w-fit max-w-[80%]"
                }>
                  {msg.content}
                </span>
                <span className="text-xs text-yellow-400 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <form onSubmit={handleSend} className="flex gap-2 mt-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="submit"
            className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-4 py-2 rounded transition"
                    disabled={loading || !input.trim()}
          >
            Send
          </button>
        </form>
        {error && <div className="mt-2 text-red-600 text-center text-sm">{error}</div>}
      </div>
    </div>
  );
}