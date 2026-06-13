module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { first_name, last_name, email, phone, company, service, budget, timeline, details, contact_method, availability, timezone } = req.body;

  // Diagnostic log so we can verify exactly what the API received from the form,
  // separate from anything that might happen downstream in GHL or Slack.
  console.log('Contact form submission received:', JSON.stringify({
    first_name: first_name,
    last_name: last_name,
    email: email,
    company: company,
    service: service || '(none)',
    details_preview: (details || '').slice(0, 200)
  }));

  // Basic validation
  if (!first_name || !last_name || !email || !company || !details) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/imHfi70hPr9q2dnxwMmK/webhook-trigger/b58e2fc4-39c8-426f-9edc-1c93a10c74dc';

  // Identify Site Health Audit requests so we can tag + ping Slack distinctly.
  // Audit requests get ONLY the site-health-audit tag (no website-lead) so the
  // generic Website Lead workflow in GHL never fires for them. This avoids the
  // tag-timing race condition that lets the workflow filter slip through.
  const isAuditRequest = (service || '').toLowerCase().includes('site health');
  const tags = isAuditRequest
    ? ['site-health-audit']
    : ['website-lead'];

  // Append the preferred contact method (and any method-specific extras) into the
  // details body too, so the lead always shows it even if the GHL custom field
  // isn't mapped on their end.
  let detailsWithMeta = details;
  if (contact_method) {
    detailsWithMeta += `\n\nPreferred contact method: ${contact_method}`;
  }
  if (availability) {
    detailsWithMeta += `\nAvailability for video call: ${availability}${timezone ? ` (${timezone})` : ''}`;
  }

  const payload = {
    firstName: first_name,
    lastName: last_name,
    email: email,
    phone: phone || '',
    companyName: company,
    source: isAuditRequest ? 'Site Health Audit page' : 'Website Contact Form',
    tags: tags,
    customField: {
      service_interested: service || '',
      budget_range: budget || '',
      project_timeline: timeline || '',
      project_details: detailsWithMeta,
      preferred_contact_method: contact_method || '',
      availability: availability || '',
      timezone: timezone || ''
    }
  };

  try {
    const response = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('GHL webhook error:', response.status, await response.text());
      return res.status(500).json({ error: 'Failed to process submission' });
    }

    // Notify Slack for every submission (Site Health Audit + regular contact form).
    // AWAIT it so Vercel doesn't kill the function before the request completes.
    // Wrapped in try/catch + 3s timeout so it cannot break or delay the submission response.
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        let slackPayload;

        if (isAuditRequest) {
          // Best-effort URL extraction from the details field
          const urlMatch = (details || '').match(/Website URL to audit:\s*(\S+)/i);
          const websiteUrl = urlMatch ? urlMatch[1] : '(not provided)';
          const notesMatch = (details || '').match(/Additional context:\s*([\s\S]*)$/i);
          const visitorNotes = notesMatch ? notesMatch[1].trim() : '';

          slackPayload = {
            username: 'InkLock Site Audit Notifier',
            text: `Site Health Request: ${first_name} ${last_name} (${company})`,
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: 'Site Health Request', emoji: false }
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Name*\n${first_name} ${last_name}` },
                  { type: 'mrkdwn', text: `*Company*\n${company}` },
                  { type: 'mrkdwn', text: `*Email*\n<mailto:${email}|${email}>` },
                  { type: 'mrkdwn', text: `*URL to audit*\n<${websiteUrl}|${websiteUrl}>` }
                ]
              }
            ]
          };

          if (visitorNotes) {
            slackPayload.blocks.push({
              type: 'section',
              text: { type: 'mrkdwn', text: `*Notes from visitor*\n${visitorNotes}` }
            });
          }

          slackPayload.blocks.push({
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `Submitted ${new Date().toISOString()} via /site-health-audit. Lead is also in GHL with tag \`site-health-audit\`.` }
            ]
          });
        } else {
          // Regular website contact-form lead.
          const fields = [
            { type: 'mrkdwn', text: `*Name*\n${first_name} ${last_name}` },
            { type: 'mrkdwn', text: `*Company*\n${company}` },
            { type: 'mrkdwn', text: `*Email*\n<mailto:${email}|${email}>` },
            { type: 'mrkdwn', text: `*Preferred contact*\n${contact_method || 'Not specified'}` }
          ];
          if (phone) {
            fields.push({ type: 'mrkdwn', text: `*Phone*\n${phone}` });
          }
          if (availability) {
            fields.push({ type: 'mrkdwn', text: `*Availability*\n${availability}${timezone ? ` (${timezone})` : ''}` });
          }
          if (service) {
            fields.push({ type: 'mrkdwn', text: `*Interested in*\n${service}` });
          }

          slackPayload = {
            username: 'InkLock Lead Notifier',
            text: `New Website Lead: ${first_name} ${last_name} (${company})`,
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: 'New Website Lead', emoji: false }
              },
              {
                type: 'section',
                fields: fields
              }
            ]
          };

          if (details) {
            slackPayload.blocks.push({
              type: 'section',
              text: { type: 'mrkdwn', text: `*Message*\n${details}` }
            });
          }

          slackPayload.blocks.push({
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `Submitted ${new Date().toISOString()} via /contact. Lead is also in GHL with tag \`website-lead\`.` }
            ]
          });
        }

        // 3-second timeout via AbortController so a slow Slack can't hold up the response.
        const slackController = new AbortController();
        const slackTimeout = setTimeout(() => slackController.abort(), 3000);
        const slackRes = await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
          signal: slackController.signal
        });
        clearTimeout(slackTimeout);

        if (!slackRes.ok) {
          console.error('Slack webhook responded non-200:', slackRes.status, await slackRes.text().catch(() => ''));
        } else {
          console.log(`Slack notification sent for ${isAuditRequest ? 'Site Health Audit' : 'website'} lead`);
        }
      } catch (slackErr) {
        console.error('Slack webhook error (non-fatal, GHL still fired):', slackErr.message || slackErr);
      }
    } else {
      console.warn('Submission received but SLACK_WEBHOOK_URL is not set');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('GHL webhook error:', error);
    return res.status(500).json({ error: 'Failed to process submission' });
  }
};
