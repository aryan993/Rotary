import { Storage } from 'megajs';
import nodemailer from 'nodemailer';
import { supabase } from "@/app/utils/dbconnect";
import { formatFullDate } from "@/lib/utils";

export async function POST(request) {
  try {
    const { MEGA_EMAIL, MEGA_PASSWORD, SMTP_USER, ELASTIC_KEY, EMAIL_FROM,EMAIL_TEST } = process.env;
    const { date } = await request.json();

    if (!MEGA_EMAIL || !MEGA_PASSWORD || !SMTP_USER || !ELASTIC_KEY || !EMAIL_FROM) {
      return Response.json({ message: 'Server configuration error' }, { status: 500 });
    }

    if (!date) {
      return Response.json({ message: 'Invalid request data' }, { status: 400 });
    }

    const normalizedDate = `2000-${date.slice(5)}`; // Convert to 2000-MM-DD

    const [birthdayData, spouseBirthdays, anniversaries] = await Promise.all([
      fetchByType(normalizedDate, 'member'),
      fetchByType(normalizedDate, 'spouse'),
      fetchByType(normalizedDate, 'anniversary'),
    ]);

    const storage = new Storage({ email: MEGA_EMAIL, password: MEGA_PASSWORD });
    await new Promise((resolve, reject) => {
      storage.on('ready', resolve);
      storage.on('error', reject);
    });

    const files = storage.root.children || [];

    const transporter = nodemailer.createTransport({
      host: 'smtp.elasticemail.com',
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: ELASTIC_KEY },
    });

    const allRecipients = [
      ...birthdayData.map(r => ({ ...r, type: 'member' })),
      ...spouseBirthdays.map(r => ({ ...r, type: 'spouse' })),
      ...anniversaries.map(r => ({ ...r, type: 'anniversary' })),
    ];

    const today = formatFullDate(date);
    let sentCount = 0;

    for (const user of allRecipients) {
      const userEmail = user.email;
      if (!userEmail) continue;

      const imageName =
        user.type === 'anniversary'
          ? `${user.id}_anniv.jpg`
          : `${user.id}_poster.jpg`;

      const file = files.find(f => f.name === imageName);
      const attachments = [];

      let cid = '';
      if (file) {
        const buffer = await new Promise((resolve, reject) => {
          const chunks = [];
          file.download()
            .on('data', chunk => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks)))
            .on('error', reject);
        });

        cid = `poster-${user.id}`;
        attachments.push({
          filename: file.name,
          content: buffer,
          cid,
        });
      }

      const name = toTitleCase(user.name);
      const partnerName = toTitleCase(user?.partner?.name || '');
      const isAnniv = user.type === 'anniversary';

      const posterImg = cid
        ? `<img src="cid:${cid}" style="width: 300px; max-width: 100%; border-radius: 12px; margin: 20px 0;" alt="Poster" />`
        : '';

      const message = isAnniv
        ? `
        <p>Dear ${name} & ${partnerName},</p>
        <p>Greetings !!!</p>
        <p>On behalf of the entire Rotary family of District 3012, We extend our warmest wishes and heartfelt blessings while you celebrate the beautiful milestone of your Wedding Anniversary today.</p>
        <p>May this special day remind you of the sacred vows you once made — promises of love, loyalty, and unwavering support. Through every season, We pray that your journey together continues to inspire all who witness the grace, strength, and joy you share in blissful togetherness.</p>
        <p>May your bond grow deeper with time, and may every anniversary bring you closer in heart and soul.</p>
        ${posterImg}
        <p>With affection and admiration,<br/>
        Your Rotary Family – District 3012<br/>
        <strong>Dr.Amita  Mohindru AKS- Chair Circle</strong><br/>
        <strong>Capt.Dr.Anil K.Mohindru AKS- Chair Circle</strong></p>
      `
        : `
        <p>Dear ${name},</p>
        <p>Greetings ! Happy Birthday</p>
        <p>On behalf of Rotary District 3012, we extend our warmest greetings and heartfelt blessings to you on your special day.</p>
        <p>Your unwavering commitment to Service Above Self has touched countless lives and brought hope and happiness to many people around you in your communities. Today, we celebrate your spirit, your service, and the radiant light you bring to the Rotary family and the world around you.</p>
        <p>May your life be filled with robust health, boundless joy, and an inspiring journey ahead. We pray for your long life, enduring happiness, and continued strength to serve with the same passion, purpose, and pride that truly define a Rotarian.</p>
        ${posterImg}
        <p>Happy Birthday! May this year be your most impactful and fulfilling yet.</p>
        <p>With deep respect and warm regards,<br/>
        Rotary District 3012<br/>
        <strong>Dr.Amita Mohindru AKS - Chair Circle</strong><br/>
        <strong>Capt.Dr.Anil K.Mohindru AKS- Chair Circle</strong></p>
      `;

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: left;">
          ${message}
        </div>
      `;

      const subject = isAnniv
        ? `Happy Anniversary, ${name} & ${partnerName}!`
        : `Happy Birthday, ${name}!`;

      await transporter.sendMail({
        from: `"DG Dr. Amita Mohindru" <${EMAIL_FROM}>`,
        to: EMAIL_TEST,
        replyTo: 'amitadg2526rid3012@gmail.com',
        subject,
        html,
        attachments,
        headers: {
          'X-ElasticEmail-Settings': JSON.stringify({
            UnsubscribeLinkText: '',
            UnsubscribeLinkType: 'None'
          })
        }
      });

      console.log(`Email sent to ${userEmail}`);
      sentCount++;
    }

    return Response.json({
      message: 'Emails sent successfully',
      count: sentCount,
    });

  } catch (error) {
    console.error('Send email error:', error);
    return Response.json({ message: error.message || 'Failed to send email' }, { status: 500 });
  }
}

async function fetchByType(date, type) {
  try {
    let query = supabase.from('user');

    if (type === 'member') {
      query = query.select('id, name, club, phone, email, role')
        .eq('type', 'member').eq('dob', date).eq('active', 'True').eq('poster', 'True').neq('email', 'NULL');
    } else if (type === 'spouse') {
      query = query.select('id, name, club, phone, email, partner:partner_id (id, name)')
        .eq('type', 'spouse').eq('dob', date).eq('active', 'True').eq('poster', 'True').neq('email', 'NULL');
    } else if (type === 'anniversary') {
      query = query.select('id, name, club, email, phone, role, partner:partner_id (id, name, club, email, phone)')
        .eq('type', 'member').eq('anniversary', date).eq('active', 'True').eq('partner.active', 'True').eq('annposter', 'True').neq('email', 'NULL');
    } else {
      throw new Error("Invalid type provided");
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) return [];

    if (type === 'anniversary') {
      const uniquePairs = new Set();
      return data.filter(item => {
        if (!item.partner) return true;
        const key1 = `${item.id}-${item.partner.id}`;
        const key2 = `${item.partner.id}-${item.id}`;
        if (uniquePairs.has(key2)) return false;
        uniquePairs.add(key1);
        return true;
      });
    }

    return data;
  } catch (err) {
    console.error("fetchByType error:", err);
    return [];
  }
}

function toTitleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
