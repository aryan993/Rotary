import { NextResponse } from 'next/server';
import { supabase } from '@/app/utils/dbconnect';

// GET: Handles list, birthday, anniversary
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const filterType = url.searchParams.get("filterType");

    if (filterType === "list") {
      const page = parseInt(url.searchParams.get("page")) || 1;
      const limit = parseInt(url.searchParams.get("limit")) || 10;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("user")
        .select("*", { count: "exact" })
        .range(offset, offset + limit - 1);

      ["name", "club", "type", "phone", "email", "dob", "anniversary"].forEach((field) => {
        const value = url.searchParams.get(field);
        if (value) {
          query = query.ilike(field, `%${value}%`);
        }
      });

      const { data, error } = await query;
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json(data);
    }

    // birthday or anniversary
    const from_date = url.searchParams.get("startDate");
    const to_date = url.searchParams.get("endDate");
    const type = url.searchParams.get("type");

    if (!filterType || !from_date || !to_date) {
      return Response.json({ error: "Missing required parameters: filterType, startDate, or endDate" }, { status: 400 });
    }

    if (!["birthday", "anniversary"].includes(filterType)) {
      return Response.json({ error: 'Invalid filterType. Must be either "birthday" or "anniversary"' }, { status: 400 });
    }

    let query;

    if (filterType === "birthday" && type === "member") {
      query = supabase
        .from("user")
        .select("id, name, club, phone, email, dob, profile")
        .eq("type", "member")
        .gte("dob", from_date)
        .lte("dob", to_date)
        .order("dob", { ascending: true });
    } else if (filterType === "birthday" && type === "spouse") {
      query = supabase
        .from("user")
        .select(`id, name, club, phone, email, dob, profile, partner:partner_id (id,name)`)
        .eq("type", "spouse")
        .gte("dob", from_date)
        .lte("dob", to_date)
        .order("dob", { ascending: true });
    } else {
      query = supabase
        .from("user")
        .select(`id, name, type, email, phone, anniversary, profile, partner:partner_id (id, name, type, profile)`)
        .eq("type", "member")
        .gte("anniversary", from_date)
        .lte("anniversary", to_date)
        .order("anniversary", { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === "42P01") return Response.json({ message: "Table not found" }, { status: 404 });
        error("Supabase query error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return Response.json({ message: "No records found for the specified date range" }, { status: 200 });
    }

    let processedData = data;
    if (filterType === "anniversary") {
      const uniquePairs = new Set();
      processedData = data.filter((item) => {
        if (!item.partner) return true;
        const pairKey1 = `${item.id}-${item.partner.id}`;
        const pairKey2 = `${item.partner.id}-${item.id}`;
        if (uniquePairs.has(pairKey2)) return false;
        uniquePairs.add(pairKey1);
        return true;
      });
    }

    return Response.json(processedData);
  } catch (err) {
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST: Handles only user and partner update via JSON
export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 400 });
    }

    const body = await request.json();
    const { id, partner, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const userUpdate = supabase.from("user").update(updateData).eq("id", id);
    const updates = [userUpdate];

    if (partner?.id) {
      const { id: partnerId, ...partnerData } = partner;
      const partnerUpdate = supabase.from("user").update(partnerData).eq("id", partnerId);
      updates.push(partnerUpdate);
    }

    const results = await Promise.all(updates);
    const errors = results.map(r => r.error).filter(Boolean);

    if (errors.length > 0) {
      console.error("User update error(s):", errors);
      return NextResponse.json({ error: "Failed to update user/partner", details: errors }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "User and partner updated" });

  } catch (error) {
    console.error("Unhandled POST error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}