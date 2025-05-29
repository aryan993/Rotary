This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Third party Services

1. Supabase to store db and perform authentication--[Supabase DB](https://supabase.com/dashboard/organizations)
2. Mega cloud to store and retrieve images--[Mega cloud](https://mega.nz/fm/9J5SUCzD)
3. Elastic Email to get service to send mass transactional email(by the account that hold the admin right to the site tbam in this case)--[Elastic Email](https://app.elasticemail.com/api/settings/manage-smtp)
4. zoho mail to generate business email(email from which the mail need to be send)--[zoho mail](https://mail.zoho.in/zm/#mail/folder/inbox)
5. Upstash to create a serverless service that call the send email at 12:01 AM everyday(Qstash schedule service)--[Upstash](https://console.upstash.com/redis?teamid=0)


## Elastic Email usage

1. STMP User(same as the owner of elastic account)
2. ELASTIC_KEY credential is required(Password of STMP credential created--- not the account password)
3. API KEY ignore
4. SMTP_FROM is the email that we use to send the email and no need of SMTP credential for that