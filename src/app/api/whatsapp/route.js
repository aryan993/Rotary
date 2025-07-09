// app/api/send-whatsapp/route.js

// app/api/send-whatsapp/route.js

import { NextResponse } from 'next/server';
import { supabase } from '@/app/utils/dbconnect';

export async function POST() {
  try {
    // Get today's IST date in YYYY-MM-DD
    const istNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const today = new Date(istNow);
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log('Current IST Date:', dateStr);

    // Fetch birthday and anniversary users
    const [birthdayData, spouseBirthdays, anniversaries] = await Promise.all([
      fetchByType(dateStr, 'member'),
      fetchByType(dateStr, 'spouse'),
      fetchByType(dateStr, 'anniversary'),
    ]);

    // Flatten all recipients into one array
    const allRecipients = [
      ...birthdayData.map(r => ({ id: r.id, phone: r.phone, type: 'birthday' })),
      ...spouseBirthdays.map(r => ({ id: r.id, phone: r.phone, type: 'birthday' })),
      ...anniversaries.map(r => ({ id: r.id, phone: r.phone, type: 'anniversary' })),
    ];

    console.log(`Total recipients to send: ${allRecipients.length}`);

    let sentCount = 0;

    // Send messages for each user
    for (const user of allRecipients) {
      const response = await fetch('http://localhost:3000/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.WHATSAPP_API_KEY || '', // Set in .env.local
        },
        body: JSON.stringify({
          number: user.phone,
          id: user.id,
          type: user.type,
        }),
      });

      const result = await response.json();
      console.log(`Message sent to ${user.phone} (${user.type}):`, result);
      sentCount++;
    }

    return NextResponse.json({ success: true, totalSent: sentCount });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function fetchByType(dateStr, type) {
  try {
    let query = supabase.from('user');
    let processedData = [];

    if (type === 'member') {
      query = query.select('id, phone').eq('type', 'member').eq('dob', dateStr).eq('active', true);
    } else if (type === 'spouse') {
      query = query.select('id, phone').eq('type', 'spouse').eq('dob', dateStr).eq('active', true);
    } else if (type === 'anniversary') {
      query = query.select('id, phone, partner:partner_id (id, active)').eq('anniversary', dateStr).eq('active', true);
    } else {
      throw new Error("Invalid type provided");
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) return [];

    if (type === "anniversary") {
      processedData = data.filter(item => item.partner && item.partner.active === true);
    } else {
      processedData = data;
    }

    return processedData;
  } catch (err) {
    console.error(`fetchByType error [${type}]:`, err);
    return [];
  }
}
