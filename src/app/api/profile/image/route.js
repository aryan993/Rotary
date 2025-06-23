import { Storage } from 'megajs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");

  if (!filename) {
    return new Response("Missing filename", { status: 400 });
  }

  const storage = await new Storage({
    email: process.env.MEGA_EMAIL,
    password: process.env.MEGA_PASSWORD,
  }).ready;

  const file = storage.root.children.find((f) => f.name === filename);
  if (!file) return new Response("File not found", { status: 404 });

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
}
