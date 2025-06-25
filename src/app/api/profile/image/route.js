import { Storage } from 'megajs';
import { supabase } from '@/app/utils/dbconnect';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");
  const cacheBust = searchParams.get("cacheBust"); // Optional cache busting parameter

  if (!filename) {
    return new Response("Missing filename", { status: 400 });
  }

  // Extract user ID and image type from filename
  const userId = filename.split("_")[0].split(".")[0];
  let imageType = 'profile'; // default
  if (filename.includes('_poster')) imageType = 'poster';
  if (filename.includes('_anniv')) imageType = 'annposter';

  try {
    // First check Supabase to see if the image exists
    const { data: user, error } = await supabase
      .from('user')
      .select(imageType)
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('Supabase error or user not found:', error);
      return new Response("User not found", { status: 404 });
    }

    // Check if the specific image type exists in Supabase
    if (!user[imageType]) {
      return new Response("Image not available", { status: 404 });
    }

    // If Supabase says the image exists, proceed with MEGA fetch
    const storage = await new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD,
    }).ready;

    const file = storage.root.children.find((f) => f.name === filename);
    if (!file) {
      // If file not found in MEGA but exists in Supabase, update Supabase
      await supabase
        .from("user")
        .update({ [imageType]: false })
        .eq('id', userId);
      return new Response("File not found", { status: 404 });
    }

    const buffer = await file.downloadBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        // Disable browser and CDN caching completely
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

  } catch (err) {
    console.error("Image fetch error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}