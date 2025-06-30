// app/api/send-birthday-email/route.js
import { Storage } from 'megajs';
import nodemailer from 'nodemailer';
import { supabase } from "@/app/utils/dbconnect";
import { formatFullDate } from "@/lib/utils";

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

    const storage = new Storage({ email: MEGA_EMAIL, password: MEGA_PASSWORD });
    await new Promise((resolve, reject) => {
      storage.on('ready', resolve);
      storage.on('error', reject);
    });

    const files = storage.root.children || [];
    const attachments = [];

    const congratsFile = files.find(f => f.name === 'try.gif');
    let congratsCid = '';

    if (congratsFile) {
      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        congratsFile.download()
          .on('data', chunk => chunks.push(chunk))
          .on('end', () => resolve(Buffer.concat(chunks)))
          .on('error', reject);
      });

      congratsCid = 'congratulations-gif';
      attachments.push({
        filename: congratsFile.name,
        content: buffer,
        cid: congratsCid,
      });
    }

    const today = formatFullDate(date);

    let htmlTable = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        <div style="max-width: 900px; margin: auto; padding: 20px; box-sizing: border-box;">
          <div style="margin-bottom: 30px;">
            ${congratsCid ? `<div style="text-align: center; margin-bottom: 30px;">
              <img src="cid:${congratsCid}" style="max-width: 100%; height: auto;" alt="Celebration Image" />
            </div>` : ''}
            <p>Dear Esteemed Rotary Leaders,</p>
            <p>Warm greetings from the Rotary family of District 3012!</p>
            <p>On behalf of District Governor <strong>Rtn. Dr. Amita Mohindru</strong> and the distinguished <strong>Rtn. Dr. Capt. Anil Mohindru</strong>, we take great pleasure in extending our heartfelt wishes to all those celebrating their birthdays and wedding anniversaries today.</p>
            <p>May your day be filled with joy, good health, and cherished moments of togetherness. This simple gesture is a celebration of the spirit of fellowship that binds us all.</p>
            <p>Stay blessed, stay healthy, and keep inspiring!</p>
          </div>
    `;

    async function generateCardsSection(title, records, getDetailsFn, sideBySide = false) {
      if (!records || records.length === 0) return '';

      let html = `
        <h2 style="font-family: Arial, sans-serif;">${title} on ${today}</h2>
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
          const buffer = await new Promise((resolve, reject) => {
            const chunks = [];
            file.download()
              .on('data', chunk => chunks.push(chunk))
              .on('end', () => resolve(Buffer.concat(chunks)))
              .on('error', reject);
          });

          mainCid = file.name === defaultImageName ? 'default-image' : `image-${record.id}`;
          attachments.push({
            filename: file.name,
            content: buffer,
            cid: mainCid,
          });
        }

        if (partnerFile) {
          const buffer = await new Promise((resolve, reject) => {
            const chunks = [];
            partnerFile.download()
              .on('data', chunk => chunks.push(chunk))
              .on('end', () => resolve(Buffer.concat(chunks)))
              .on('error', reject);
          });

          partnerCid = partnerFile.name === defaultImageName ? 'default-image' : `image-${record.partner.id}`;
          attachments.push({
            filename: partnerFile.name,
            content: buffer,
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

    htmlTable += await generateCardsSection("Member's Birthday", birthdayData, (record) => ({
      name: record.name || '',
      extraFields: [
        { label: 'Post:', value: record.role },
        { label: 'Club:', value: record.club },
        { label: 'Phone:', value: record.phone },
        { label: 'Email:', value: record.email },
      ],
    }));

    htmlTable += await generateCardsSection("Partner's Birthday", spouseBirthdays, (record) => ({
      name: record.name || '',
      extraFields: [
        { label: "Partner:", value: record?.partner?.name },
        { label: 'Phone:', value: record.phone },
        { label: 'Email:', value: record.email },
      ],
    }));

    htmlTable += await generateCardsSection('Wedding Anniversary', anniversaries, (record) => ({
      name: `${record.name} & ${record?.partner?.name}` || '',
      extraFields: [
        { label: 'Post:', value: record.role },
        { label: 'Club:', value: record.club },
        { label: 'Phone:', value: record.phone },
        { label: 'Email:', value: record.email },
      ],
      partnerName: record?.partner?.name || '',
    }), true);

    const logo006 = files.find(f => f.name === '006.jpg');
    let logo006Cid = '';
    if (logo006) {
      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        logo006.download().on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
      });
      logo006Cid = 'logo-006';
      attachments.push({ filename: logo006.name, content: buffer, cid: logo006Cid });
    }

    const logo007 = files.find(f => f.name === '007.jpg');
    let logo007Cid = '';
    if (logo007) {
      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        logo007.download().on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
      });
      logo007Cid = 'logo-007';
      attachments.push({ filename: logo007.name, content: buffer, cid: logo007Cid });
    }

    const logo008 = files.find(f => f.name === '008.jpg');
    let logo008Cid = '';
    if (logo008) {
      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        logo008.download().on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
      });
      logo008Cid = 'logo-008';
      attachments.push({ filename: logo008.name, content: buffer, cid: logo008Cid });
    }

    const logo009 = files.find(f => f.name === '009.jpg');
    let logo009Cid = '';
    if (logo009) {
      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        logo009.download().on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
      });
      logo009Cid = 'logo-009';
      attachments.push({ filename: logo009.name, content: buffer, cid: logo009Cid });
    }

    htmlTable += `
  <hr style="margin: 40px 0;" />
  <div style="font-family: Arial, sans-serif; font-size: 14px; color: #555;">
    <p>With best wishes and regards,<br />
      <strong>Team Influencer 2025-26</strong>
    </p>

    <div style="display: flex; justify-content: center; gap: 20px; margin: 10px 0;">
      ${logo009Cid ? `<img src="cid:${logo009Cid}" style="max-height: 60px; margin: 0px 02px;" alt="Team Logo" />` : ''}  
      ${logo006Cid ? `<img src="cid:${logo006Cid}" style="max-height: 60px; margin: 0px 02px;" alt="Team Logo" />` : ''}
      ${logo008Cid ? `<img src="cid:${logo008Cid}" style="max-height: 60px; margin: 0px 02px;" alt="Team Logo" />` : ''}
    </div>

    <div style="margin-top: 20px;">
      <table style="border-collapse: collapse; margin: 0 auto;">
        <tr>
          <td style="padding: 10px; border: none;">
            ${logo007Cid ? `<img src="cid:${logo007Cid}" style="max-height: 60px;" alt="TBAM Logo" />` : ''}
          </td>
          <td style="border-left: 1px solid black; padding: 10px; vertical-align: middle; border-top: none; border-bottom: none; border-right: none;">
            <p style="margin: 0;">
              <em>Designed and Maintained by</em><br />
              <strong>Tirupati Balaji Advertising & Marketing</strong><br />
              (Director of TBAM Group Rtn Dr Dheeraj Kumar Bhargava Ph:+919810522380)<br />
              Founder and Charter President of RC Indirapuram Galore<br />
              District Club Co-coordinator 2025-26
            </p>
          </td>
        </tr>
      </table>
    </div>
    <div style="text-align: center; margin: 40px 0; font-family: Arial, sans-serif; font-size: 14px; color: #777;">
      If you would prefer not to receive these emails, please
      <strong>click the unsubscribe link at the bottom of this email</strong>.
    </div>
  </div>
</div></body></html>`;

    const transporter = nodemailer.createTransport({
      host: 'smtp.elasticemail.com',
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: ELASTIC_KEY },
    });

    const email_list = EMAIL_TEST.split(',').map(email => email.trim());

    for (const recipient of email_list) {
      await transporter.sendMail({
        from: `"DG Dr. Amita Mohindru" <${EMAIL_FROM}>`,
        to: recipient,
        replyTo: 'amitadg2526rid3012@gmail.com',
        subject: `Birthday and Anniversary Notification ${today}`,
        html: htmlTable,
        attachments,
        headers: {
          'X-ElasticEmail-Settings': JSON.stringify({
            UnsubscribeLinkText: '',
            UnsubscribeLinkType: 'None'
          })
        }
      });
      console.log("email sent to " + recipient);
    }

    return Response.json({
      message: 'Email sent successfully',
      count: birthdayData.length,
    });

  } catch (error) {
    console.error('Send email error:', error);
    return Response.json(
      { message: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

async function fetchByType(date, type) {
  try {
    let query = supabase.from('user');
    let processedData = [];

    if (type === 'member') {
      query = query
        .select('id, name, club, phone, email, role')
        .eq('type', 'member')
        .eq('dob', date)
        .eq('active', true);
    } else if (type === 'spouse') {
      query = query
        .select('id, name, club, phone, email, partner:partner_id (id, name)')
        .eq('type', 'spouse')
        .eq('dob', date)
        .eq('active', true);
    } else if (type === 'anniversary') {
      query = query
        .select('id, name, club, email, phone, role, partner:partner_id (id, name, club, email, phone, active)')
        .eq('type', 'member')
        .eq('anniversary', date)
        .eq('active', true);
    } else {
      throw new Error("Invalid type provided");
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) return [];

    processedData = data;

    if (type === "anniversary") {
      const uniquePairs = new Set();
      processedData = data.filter((item) => {
        // Ensure both member and partner are active
        if (!item.partner || item.partner.active !== true) return false;

        const pairKey1 = `${item.id}-${item.partner.id}`;
        const pairKey2 = `${item.partner.id}-${item.id}`;
        if (uniquePairs.has(pairKey2)) return false;

        uniquePairs.add(pairKey1);
        return true;
      });
    }

    return processedData;
  } catch (err) {
    console.error("fetchByType error:", err);
    return [];
  }
}

function toTitleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      if (lower === 'pdg') return 'PDG';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

