import { NextResponse } from "next/server";
import { Storage } from "megajs";
import { supabase } from "@/app/utils/dbconnect";

export async function POST(req) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    }

    const filename = `${id}_poster.jpg`;

    const storage = await new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD,
    }).ready;

    const file = storage.root.children.find(child => child.name === filename);
    if (file) {
      await file.delete(true);
    }

    const { error } = await supabase
      .from("user")
      .update({ poster: false }) // Assuming you store `poster: true` like profile
      .eq("id", id);

    if (error) {
      console.error("DB update error:", error);
      return NextResponse.json({ error: "Failed to update DB" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Poster image deleted" });
  } catch (err) {
    console.error("Poster delete error:", err);
    return NextResponse.json({ error: "Failed to delete poster" }, { status: 500 });
  }
}
