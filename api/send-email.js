// api/send-email.js
import nodemailer from "nodemailer";
import axios from "axios";
import formidable from "formidable";
import { kv } from "@vercel/kv";
import fs from "fs/promises";

export const config = {
  api: { bodyParser: false }, // required for multipart/form-data
};

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

async function rateLimit(req) {
  const ip = getClientIp(req);

  const windowSec = 15 * 60;
  const max = 5;

  const key = `rl:contact:${ip}`;
  const count = await kv.incr(key);
  if (count === 1) await kv.expire(key, windowSec);

  return count <= max;
}

async function verifyRecaptcha(token) {
  if (process.env.RECAPTCHA_DISABLED === "true") return true;

  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) throw new Error("Missing RECAPTCHA_SECRET");
  if (!token) return false;

  const resp = await axios.post(
    "https://www.google.com/recaptcha/api/siteverify",
    null,
    { params: { secret, response: token } }
  );

  return resp.data?.success === true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const allowed = await rateLimit(req);
    if (!allowed)
      return res.status(429).send("Too many requests, please try again later.");
  } catch {
    return res.status(503).send("Rate limiter unavailable.");
  }

  const form = formidable({
    maxFileSize: 2 * 1024 * 1024,
    keepExtensions: true,
    filter: ({ originalFilename }) => {
      if (!originalFilename) return true;
      return /\.(jpg|jpeg|png)$/i.test(originalFilename);
    },
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).send(err.message || "Invalid form data.");

    const name = (fields.name || "").toString().trim();
    const email = (fields.email || "").toString().trim();
    const phone = (fields.phone || "").toString().trim();
    const message = (fields.message || "").toString().trim();
    const captcha = (fields["g-recaptcha-response"] || "").toString();

    if (!name || !email || !phone || !message || !captcha) {
      return res.status(400).send("All fields and CAPTCHA are required.");
    }
    if (!isValidEmail(email))
      return res.status(400).send("Invalid email format.");

    try {
      const ok = await verifyRecaptcha(captcha);
      if (!ok) return res.status(400).send("CAPTCHA verification failed.");
    } catch {
      return res.status(500).send("CAPTCHA verification error.");
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const attachments = [];
      const attachment = files.attachment
        ? Array.isArray(files.attachment)
          ? files.attachment[0]
          : files.attachment
        : null;

      if (attachment?.filepath && attachment.size > 0) {
        attachments.push({
          filename: attachment.originalFilename || "attachment",
          content: await fs.readFile(attachment.filepath),
          contentType: attachment.mimetype || undefined,
        });
      }

      const mailOptions = {
        from: `"Yeznas Upholstery" <${process.env.GMAIL_USER}>`,
        to: `"Yeznas Upholstery" <${process.env.BUSINESS_EMAIL}>`,
        replyTo: `"${name}" <${email}>`,
        subject: `New Website Inquiry — ${name}`,
        text: [
          "NEW WEBSITE INQUIRY",
          "-------------------",
          "",
          `Name:  ${name}`,
          `Email: ${email}`,
          `Phone: ${phone}`,
          "",
          "Message:",
          message,
        ].join("\n"),
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#111;">
            <h2 style="margin:0 0 16px;">New Website Inquiry</h2>
            <table style="border-collapse:collapse;margin-bottom:20px;">
              <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Name</td><td>${name}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Email</td><td>${email}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Phone</td><td>${phone}</td></tr>
            </table>
            <div style="margin-bottom:6px;font-weight:600;">Message</div>
            <div style="white-space:pre-wrap;padding:12px;border-left:3px solid #000;background:#f7f7f7;">${message}</div>
          </div>
        `,
        attachments,
      };

      await transporter.sendMail(mailOptions);
      return res.status(200).send("Message sent successfully.");
    } catch (e) {
      return res.status(500).send("Error sending message: " + e.message);
    }
  });
}
