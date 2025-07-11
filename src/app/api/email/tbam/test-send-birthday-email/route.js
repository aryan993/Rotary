// app/api/send-birthday-email/route.js
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

    const congratsFile = files.find(f => f.name === 'tbam.png');
    let congratsCid = '';

    if (congratsFile) {
      const buffer = await downloadFile(congratsFile);
      congratsCid = 'congratulations-image';
      attachments.push({
        filename: congratsFile.name,
        content: buffer,
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
          <div style="max-width: 900px; margin: 0 auto; padding: 20px; box-sizing: border-box;">
            ${congratsCid ? `<div style="text-align: center; margin-bottom: 30px;">
              <img src="cid:${congratsCid}" style="max-width: 100%; height: auto;" />
            </div>` : ''}
            <p>Dear Friends,</p>
            <p>On behalf of the entire team at <strong>Tirupati Balaji Advertising & Marketing, Tirupati Balaji Chronicle Bilingual News Paper </strong>-<strong style="color: red;">Dr Dheeraj K Bhargava </strong>,<strong style="color: red;"> Mrs Manisha Bhargava</strong> And <strong style="color: red;">Prateek Bhargava</strong> extend warmest wishes to all those celebrating their birthdays and wedding anniversaries today.</p>
            <p>May this day bring you immense happiness, love, and cherished moments with your loved ones. Here's to new beginnings, memorable experiences, and a life filled with prosperity and positivity.</p>
            <p>Stay happy, stay healthy, and keep shining your light on the world!</p>
    `;

    async function generateCardsSection(title, records, getDetailsFn, sideBySide = false) {
      if (!records || records.length === 0) return '';

      let html = `
        <h2 style="font-family: Arial, sans-serif;">${title} on ${date.slice(8)}-${date.slice(5,7)}</h2>
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
            .map(f => `<p style="margin: 4px 0; font-size: 14px;"><strong>${f.label}</strong> ${f.value}</p>`)
            .join('');

        html += `
          <div class="card">
            <div style="background-color: rgba(254,244,223,255); border: 1px solid #a1cbe2; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif; display: flex; padding: 10px; box-sizing: border-box;">
              <div style="flex-shrink: 0; margin-right: 10px;">
                <div style="display: flex; gap: 8px;">
                  <img src="cid:${mainCid}" width="60" height="84" style="border-radius: 12px; object-fit: cover;" />
                  ${partnerCid ? `<img src="cid:${partnerCid}" width="60" height="84" style="border-radius: 12px; object-fit: cover;" />` : ''}
                </div>
              </div>
              <div>
                <h3 style="margin: 0 0 8px 0; font-size: 16px;">${details.name || ''}</h3>
                ${sideBySide && details.partnerName ? `
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
        { label: 'Phone:', value: record.phone },
        { label: 'Email: ', value: record.email },
      ],
      partnerName: record?.partner?.name || '',
    }), true);

    htmlTable += `
      <hr style="margin: 40px 0;" />
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #555;">
        <p>With best wishes and regards,<br />
        <strong>Team Tirupati Balaji Advertising & Marketing</strong></p>
        <div style="text-align: center; margin-top: 20px;">
          <p>
            <em>Designed and Maintained by</em>
            <strong>Tirupati Balaji Advertising & Marketing</strong><br />
            (Chairman of TBAM Group Dr Dheeraj Kumar Bhargava)<br />
            (Dr Dheeraj Kumar Bhargava-9810522380, Mrs Manisha Bhargava-9818373200, Prateek Bhargava-8130640011)<br />
            (https://tbam.co.in/)<br />
          </p>
        </div>
      </div>
          </div>
        </body>
      </html>
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
      from: `"Dr. Dheeraj K Bhargava" <${EMAIL_FROM}>`,
      to: EMAIL_TEST,
      subject: `Birthday and Anniversary Notification ${date.slice(8)}-${date.slice(5,7)}`,
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

// downloadFile, compressImage, fetchByType remain unchanged

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
      query = query.select('id, name, phone, email').eq('type', 'member').eq('dob', date).eq('active', 'True');
    } else if (type === 'spouse') {
      query = query.select('id, name, phone, email,partner:partner_id (id,name)').eq('type', 'spouse').eq('dob', date).eq('active', 'True');
    } else if (type === 'anniversary') {
      query = query.select('id,name,email,phone,partner:partner_id (id,name,email,phone)').eq('type', 'member').eq('anniversary', date).eq('active', 'True');
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
