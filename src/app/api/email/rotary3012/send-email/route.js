// server.js (Express App)
import express from 'express';
import nodemailer from 'nodemailer';

const app = express();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

app.get('/send-emails', async (req, res) => {
  try {
    const { SMTP_USER, ELASTIC_KEY, EMAIL_FROM } = process.env;

    const transporter = nodemailer.createTransport({
      host: 'smtp.elasticemail.com',
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: ELASTIC_KEY },
    });

    for (let count = 0; count <= 80; count++) {
      const html = `<p>This is email number <strong>${count}</strong></p>`;

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: 'bansalaryan2000@gmail.com',
        subject: `Count: ${count}`,
        html,
      });

      console.log(`Email ${count} sent.`);
      await delay(15000);
    }

    res.json({ message: 'All emails sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
