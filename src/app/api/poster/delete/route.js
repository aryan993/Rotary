// src/app/api/poster/delete/route.js
import { NextResponse } from "next/server";
import { Storage } from "megajs";
import { supabase } from "@/app/utils/dbconnect";

export async function POST(req) {
  try {
    const { id, category } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    }
    console.log("id is: "+id+"the category is"+category)

    // Determine filename based on category
    const filename = category === 'anniversary' 
      ? `${id}_anniv.jpg` 
      : `${id}_poster.jpg`;

    // Connect to MEGA storage
    const storage = await new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD,
    }).ready;

    // Find and delete the file
    const file = storage.root.children.find(child => child.name === filename);
    if (file) {
      await file.delete(true);
    }

    // Update Supabase - determine which field to update based on category
    const updateField = category === 'anniversary' ? 'annposter' : 'poster';
    const { error } = await supabase
      .from("user")
      .update({ [updateField]: false })
      .eq("id", id);

    if (error) {
      console.error("DB update error:", error);
      return NextResponse.json({ error: "Failed to update DB" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${category === 'anniversary' ? 'Anniversary poster' : 'Poster'} deleted successfully` 
    });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ 
      error: `Failed to delete ${category === 'anniversary' ? 'anniversary poster' : 'poster'}` 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  );
}