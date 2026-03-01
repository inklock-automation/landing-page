const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { first_name, last_name, email, phone, company, service, budget, timeline, details } = req.body;

  // Basic validation
  if (!first_name || !last_name || !email || !company || !details) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Gmail SMTP transport
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  // Beautiful HTML email
  const htmlEmail = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#08080e;border-radius:12px;overflow:hidden;border:1px solid rgba(147,51,234,.2)">
      <div style="padding:32px 32px 24px;border-bottom:1px solid rgba(147,51,234,.1)">
        <h1 style="margin:0 0 4px;font-size:20px;background:linear-gradient(135deg,#6e9cd5,#9333ea,#c026d3,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent">New Lead from InkLock</h1>
        <div style="width:60px;height:2px;border-radius:1px;background:linear-gradient(90deg,#6e9cd5,#9333ea,#c026d3,#ec4899);margin-top:8px"></div>
      </div>
      <div style="padding:24px 32px">
        <table style="width:100%;border-collapse:collapse;color:#a09bb0;font-size:14px;line-height:1.6">
          <tr><td style="padding:8px 0;color:#6e9cd5;font-weight:600;width:130px;vertical-align:top">Name</td><td style="padding:8px 0;color:#fff">${first_name} ${last_name}</td></tr>
          <tr><td style="padding:8px 0;color:#6e9cd5;font-weight:600;vertical-align:top">Email</td><td style="padding:8px 0;color:#fff"><a href="mailto:${email}" style="color:#9333ea">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px 0;color:#6e9cd5;font-weight:600;vertical-align:top">Phone</td><td style="padding:8px 0;color:#fff">${phone}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6e9cd5;font-weight:600;vertical-align:top">Company</td><td style="padding:8px 0;color:#fff">${company}</td></tr>
          ${service ? `<tr><td style="padding:8px 0;color:#6e9cd5;font-weight:600;vertical-align:top">Service</td><td style="padding:8px 0;color:#fff">${service}</td></tr>` : ''}
          ${budget ? `<tr><td style="padding:8px 0;color:#6e9cd5;font-weight:600;vertical-align:top">Budget</td><td style="padding:8px 0;color:#fff">${budget}</td></tr>` : ''}
          ${timeline ? `<tr><td style="padding:8px 0;color:#6e9cd5;font-weight:600;vertical-align:top">Timeline</td><td style="padding:8px 0;color:#fff">${timeline}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;padding:16px;background:rgba(147,51,234,.06);border:1px solid rgba(147,51,234,.1);border-radius:8px">
          <div style="color:#6e9cd5;font-weight:600;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Project Details</div>
          <div style="color:#d4d0de;font-size:14px;line-height:1.7;white-space:pre-wrap">${details}</div>
        </div>
      </div>
      <div style="padding:16px 32px;border-top:1px solid rgba(147,51,234,.1);font-size:11px;color:#5a5470">
        Submitted from inklockautomation.com contact form
      </div>
    </div>
  `;

  // Plain text fallback
  const textEmail = `
NEW LEAD — InkLock Automation

Name: ${first_name} ${last_name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}
Company: ${company}
${service ? `Service: ${service}` : ''}
${budget ? `Budget: ${budget}` : ''}
${timeline ? `Timeline: ${timeline}` : ''}

Project Details:
${details}
  `.trim();

  try {
    await transporter.sendMail({
      from: `InkLock Automation <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email,
      subject: `New Lead: ${first_name} ${last_name} — ${company}`,
      text: textEmail,
      html: htmlEmail
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
