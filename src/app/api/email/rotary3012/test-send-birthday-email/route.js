// app/api/send-birthday-email/route.js
import { Storage } from 'megajs';
import nodemailer from 'nodemailer';
import { supabase } from "@/app/utils/dbconnect";
import sharp from 'sharp';

export async function POST(request) {
  try {
    const { MEGA_EMAIL, MEGA_PASSWORD, SMTP_USER, ELASTIC_KEY, EMAIL_TO, EMAIL_FROM, EMAIL_TEST } = process.env;
    const { date } = await request.json();

    if (!MEGA_EMAIL || !MEGA_PASSWORD || !SMTP_USER || !ELASTIC_KEY || !EMAIL_TO) {
      return Response.json({ message: 'Server configuration error' }, { status: 500 });
    }

    if (!date) {
      return Response.json({ message: 'Invalid request data' }, { status: 400 });
    }

    const [birthdayData, spouseBirthdays, anniversaries] = await Promise.all([
      fetchByType(date, 'member'),
      fetchByType(date, 'spouse'),
      fetchByType(date, 'anniversary'),
    ]);
    console.log("data fetched");

    const storage = new Storage({ email: MEGA_EMAIL, password: MEGA_PASSWORD });
    await new Promise((resolve, reject) => {
      storage.on('ready', resolve);
      storage.on('error', reject);
    });

    const files = storage.root.children || [];
    const attachments = [];

    const congratsFile = files.find(f => f.name === 'Congratulations.png');
    let congratsCid = '';

    if (congratsFile) {
      const buffer = await downloadFile(congratsFile);
      congratsCid = 'congratulations-image';
      attachments.push({
        filename: congratsFile.name,
        content: buffer, // Uncompressed
        cid: congratsCid,
      });
    }

    let htmlTable = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <div style="margin-bottom: 30px;">
            ${congratsCid ? `<div style="text-align: center; margin-bottom: 30px;">
              <img src="cid:${congratsCid}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
            </div>` : ''}
            <p>Dear Esteemed Rotary Leaders,</p>
            <p>Warm greetings from the Rotary family of District 3012!</p>
            <p>On behalf of District Governor <strong>Rtn. Dr. Amita Mohindru</strong> and the distinguished <strong>Rtn. Dr. Capt. Anil Mohindru</strong>, we take great pleasure in extending our heartfelt wishes to all those celebrating their birthdays and anniversaries today.</p>
            <p>May your day be filled with joy, good health, and cherished moments of togetherness. This simple gesture is a celebration of the spirit of fellowship that binds us all.</p>
            <p>Stay blessed, stay healthy, and keep inspiring!</p>
          </div>
    `;

    async function generateCardsSection(title, records, getDetailsFn, sideBySide = false) {
      if (!records || records.length === 0) return '';

      let html = `
        <h2 style="font-family: Arial, sans-serif;">${title} on ${date.slice(8)}-${date.slice(5, 7)}</h2>
        <style>
          .card-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
            box-sizing: border-box;
            margin-bottom: 20px;
          }

          .card {
            flex: 1 1 calc(50% - 10px);
            max-width: calc(50% - 10px);
            padding: 10px;
            box-sizing: border-box;
          }

          @media only screen and (max-width: 600px) {
            .card {
              flex: 1 1 100%;
              max-width: 100%;
            }
          }
        </style>
        <div class="card-container">
      `;

      for (const record of records) {
        const imageName = `${record.id}.jpg`;
        const partnerImageName = record?.partner?.id ? `${record.partner.id}.jpg` : null;
        const defaultImageName = '0.jpg';

        const file = files.find(f => f.name === imageName) || files.find(f => f.name === defaultImageName);
        const partnerFile = partnerImageName ? (files.find(f => f.name === partnerImageName) || files.find(f => f.name === defaultImageName)) : null;

        let mainCid = '';
        let partnerCid = '';

        if (file) {
          const buffer = await downloadFile(file);
          const compressed = file.name !== 'Congratulations.png' ? await compressImage(buffer) : buffer;
          mainCid = file.name === defaultImageName ? 'default-image' : `image-${record.id}`;
          attachments.push({
            filename: file.name,
            content: compressed,
            cid: mainCid,
          });
        }

        if (partnerFile) {
          const buffer = await downloadFile(partnerFile);
          const compressed = partnerFile.name !== 'Congratulations.png' ? await compressImage(buffer) : buffer;
          partnerCid = partnerFile.name === defaultImageName ? 'default-image' : `image-${record.partner.id}`;
          attachments.push({
            filename: partnerFile.name,
            content: compressed,
            cid: partnerCid,
          });
        }

        const details = getDetailsFn(record);

        const renderFields = (fields) =>
          fields
            .filter(f => f.value && f.value !== 'NULL')
            .map(f => `<p style="margin: 4px 0; font-size: 14px;"><strong>${f.label}</strong> ${toTitleCase(f.value)}</p>`)
            .join('');

        html += `
          <div class="card">
            <div style="background-color: rgba(196,230,248,1); border: 1px solid #a1cbe2; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif; display: flex; padding: 10px; box-sizing: border-box;">
              <div style="flex-shrink: 0; margin-right: 10px;">
                <div style="display: flex; gap: 8px;">
                  <img src="cid:${mainCid}" width="60" height="84" style="border-radius: 12px; object-fit: cover;" />
                  ${partnerCid ? `<img src="cid:${partnerCid}" width="60" height="84" style="border-radius: 12px; object-fit: cover;" />` : ''}
                </div>
              </div>
              <div>
                <h3 style="margin: 0 0 4px 0; font-size: 16px;">${toTitleCase(details.name) || ''}</h3>
                ${sideBySide && toTitleCase(details.partnerName) ? `
                  <div style="display: flex; gap: 40px;">
                    <div>${renderFields(details.extraFields)}</div>
                  </div>` :
            `${renderFields(details.extraFields)}`}
              </div>
            </div>
          </div>
        `;
      }

      html += '</div>';
      return html;
    }

    htmlTable += await generateCardsSection('Birthdays', birthdayData, (record) => ({
      name: record.name || '',
      extraFields: [
        { label: 'Post:', value: record.role },
        { label: 'Club:', value: record.club },
        { label: 'Phone:', value: record.phone },
        { label: 'Email:', value: record.email },
      ],
    }));

    htmlTable += await generateCardsSection("Spouse's Birthdays", spouseBirthdays, (record) => ({
      name: record.name || '',
      extraFields: [
        { label: "Partner:", value: record?.partner?.name },
        { label: 'Phone:', value: record.phone },
        { label: 'Email:', value: record.email },
      ],
    }));

    htmlTable += await generateCardsSection('Anniversaries', anniversaries, (record) => ({
      name: `${record.name} & ${record?.partner?.name}` || '',
      extraFields: [
        { label: 'Post:', value: record.role },
        { label: 'Club:', value: record.club },
        { label: 'Phone:', value: record.phone },
        { label: 'Email: ', value: record.email },
      ],
      partnerName: record?.partner?.name || '',
    }), true);

    htmlTable += `
      <hr style="margin: 40px 0;" />
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #555;">
        <p>With best wishes and regards,<br />
        <strong>District Secretariat 2025-2026</strong></p>
        <div style="text-align: center; margin-top: 20px;">
          <p>
            <em>Designed and Maintained by</em>
            <strong>Tirupati Balaji Advertising & Marketing</strong><br />
            (Director of TBAM Group Rtn Dr Dheeraj Kumar Bhargava<br />
            Founder and Charter President of RC Indirapuram Galore, District Club Co-ordinator)
          </p>
        </div>
      </div>
    </body></html>
    `;

    const transporter = nodemailer.createTransport({
      host: 'smtp.elasticemail.com',
      port: 587,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: ELASTIC_KEY,
      },
    });

    const mailOptions = {
      from: `"DG Dr. Amita Mohindru" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      bcc: EMAIL_TEST,
      subject: `Birthday and Anniversary Notification ${date.slice(8)}-${date.slice(5, 7)}`,
      html: htmlTable,
      attachments,
    };

    await transporter.sendMail(mailOptions);

    const htmlSize = Buffer.byteLength(mailOptions.html, 'utf-8');
    const attachmentsSize = attachments.reduce((sum, att) => sum + (att.content?.length || 0), 0);
    const totalSize = htmlSize + attachmentsSize;

    console.log(`Email sent successfully. Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

    return Response.json({
      message: 'Email sent successfully',
      count: birthdayData.length,
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    });

  } catch (error) {
    console.error('Send email error:', error);
    return Response.json(
      { message: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

async function downloadFile(file) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    file.download()
      .on('data', chunk => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
}

async function compressImage(buffer) {
  try {
    return await sharp(buffer)
      .resize({ width: 300 })
      .jpeg({ quality: 60 })
      .toBuffer();
  } catch (e) {
    console.error("Image compression error:", e);
    return buffer;
  }
}

async function fetchByType(date, type) {
  try {
    let query = supabase.from('user');

    if (type === 'member') {
      query = query.select('id, name, club, phone, email,role').eq('type', 'member').eq('dob', date).eq('active', 'True');
    } else if (type === 'spouse') {
      query = query.select('id, name, club, phone, email,partner:partner_id (id,name)').eq('type', 'spouse').eq('dob', date).eq('active', 'True');
    } else if (type === 'anniversary') {
      query = query.select('id,name,club,email,phone,role,partner:partner_id (id,name,club,email,phone)').eq('type', 'member').eq('anniversary', date).eq('active', 'True');
    } else {
      throw new Error("Invalid type provided");
    }

    const { data, error } = await query;
    if (error) throw error;

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

    return data || [];
  } catch (err) {
    console.error("fetchByType error:", err);
    return [];
  }
}

function toTitleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}