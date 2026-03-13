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

  const payload = {
    firstName: first_name,
    lastName: last_name,
    email: email,
    phone: phone || '',
    companyName: company,
    source: 'Website Contact Form',
    tags: ['website-lead'],
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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('GHL webhook error:', error);
    return res.status(500).json({ error: 'Failed to process submission' });
  }
};
