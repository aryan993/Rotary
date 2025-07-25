// app/api/send-birthday-email/route.js
// app/api/send-birthday-email/route.js
import { Storage } from 'megajs';
import nodemailer from 'nodemailer';
import { supabase } from "@/app/utils/dbconnect";
import sharp from 'sharp';


export async function POST(request) {
  try {
    const { SMTP_USER, ELASTIC_KEY, EMAIL_FROM } = process.env;

    if (!SMTP_USER || !ELASTIC_KEY || !EMAIL_FROM) {
      return Response.json({ message: 'Server configuration error' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.elasticemail.com',
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: ELASTIC_KEY },
    });

    // Function to wait for given milliseconds
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (let count = 0; count <= 80; count++) {
      const subject = `Count: ${count}`;
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <p>Hello Aryan,</p>
          <p>This is test email number <strong>${count}</strong>.</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"DG Dr. Amita Mohindru" <${EMAIL_FROM}>`,
        to: 'bansalaryan2000@gmail.com',
        subject,
        html,
        replyTo: 'amitadg2526rid3012@gmail.com',
        headers: {
          'X-ElasticEmail-Settings': JSON.stringify({
            UnsubscribeLinkText: '',
            UnsubscribeLinkType: 'None'
          })
        }
      });

      console.log(`Sent email ${count} to bansalaryan2000@gmail.com`);
      await delay(15000); // Wait for 15 seconds before sending the next one
    }

    return Response.json({ message: 'All emails sent' });
  } catch (error) {
    console.error('Send email error:', error);
    return Response.json({ message: error.message || 'Failed to send email' }, { status: 500 });
  }
}
