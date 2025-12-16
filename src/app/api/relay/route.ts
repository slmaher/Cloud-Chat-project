import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

console.log("=== relay/route.ts module loaded ===");

export const runtime = "edge";

export async function POST(req: NextRequest) {
  console.log("=== /api/relay POST handler called ===");
  try {
    console.log("Creating Supabase server...");
    const supabase = await createSupabaseServer();
    console.log("Getting user from Supabase auth...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("User not authorized:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Parsing request body...");
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      console.log("Invalid content:", content);
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    console.log("Fetching user with org...");
    const userLookup = await supabase
      .from("User")
      .select("id, organizationId")
      .eq("id", user.id)
      .single();
    const { error: fetchError } = userLookup;
    let userData = userLookup.data;

    // If user doesn't exist, create them
    if (fetchError || !userData) {
      console.log(
        "User not found, creating new user. Fetch error:",
        fetchError
      );
      // Get the first available organization
      const { data: orgs, error: orgError } = await supabase
        .from("Organization")
        .select("id")
        .limit(1);

      if (orgError || !orgs || orgs.length === 0) {
        console.log("No organizations available:", orgError);
        return NextResponse.json(
          { error: "No organizations available" },
          { status: 500 }
        );
      }

      const organizationId = orgs[0].id;
      console.log("Creating user with org id:", organizationId);
      // Create the user
      const { error: insertError } = await supabase.from("User").insert({
        id: user.id,
        email: user.email,
        role: "STUDENT",
        organizationId: organizationId,
      });

      if (insertError) {
        console.log("Error inserting user:", insertError);
        if (insertError.code === "23505") {
          // User already exists, try to fetch again
          const { data: retryUserData } = await supabase
            .from("User")
            .select("id, organizationId")
            .eq("id", user.id)
            .single();
          userData = retryUserData;
        } else {
          return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
          );
        }
      } else {
        // Fetch the newly created user
        const { data: newUserData } = await supabase
          .from("User")
          .select("id, organizationId")
          .eq("id", user.id)
          .single();
        userData = newUserData;
      }
    }

    if (!userData) {
      console.log("User data still not found after insert.");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const messageId = crypto.randomUUID();
    console.log("Inserting user message:", {
      id: messageId,
      content,
      userId: user.id,
      organizationId: userData.organizationId,
    });
    // Insert user message
    const { error: insertError } = await supabase.from("Message").insert({
      id: messageId,
      content,
      userId: user.id,
      organizationId: userData.organizationId,
    });
    if (insertError) {
      console.log("Error inserting message:", insertError);
      return NextResponse.json(
        { error: "Failed to insert message" },
        { status: 500 }
      );
    }

    console.log("Message inserted successfully.");
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.log("=== RELAY API ERROR ===");
    console.error("Relay API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
