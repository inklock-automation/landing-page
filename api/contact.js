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

  const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/imHfi70hPr9q2dnxwMmK/webhook-trigger/b58e2fc4-39c8-426f-9edc-1c93a10c74dc';

  // Identify Site Health Audit requests so we can tag + ping Slack distinctly
  const isAuditRequest = (service || '').toLowerCase().includes('site health');
  const tags = isAuditRequest
    ? ['website-lead', 'site-health-audit']
    : ['website-lead'];

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
      project_details: details
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

    // Fire a rich Slack notification for Site Health Audit requests.
    // Non-blocking: failure here must NOT break the submission flow.
    if (isAuditRequest && process.env.SLACK_WEBHOOK_URL) {
      // Best-effort URL extraction from the details field
      const urlMatch = (details || '').match(/Website URL to audit:\s*(\S+)/i);
      const websiteUrl = urlMatch ? urlMatch[1] : '(not provided)';
      const notesMatch = (details || '').match(/Additional context:\s*([\s\S]*)$/i);
      const visitorNotes = notesMatch ? notesMatch[1].trim() : '';

      const slackPayload = {
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

      // Fire and forget. Don't await — we don't want Slack lag to delay the visitor's success state.
      fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload)
      }).catch((slackErr) => {
        console.error('Slack webhook error (non-fatal):', slackErr);
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('GHL webhook error:', error);
    return res.status(500).json({ error: 'Failed to process submission' });
  }
};
