module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, type, source } = req.body || {};

  // Basic validation
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Map signup type to tags
  const TAG_MAP = {
    newsletter: ['newsletter-subscriber', 'website-lead'],
    'podcast-waitlist': ['podcast-waitlist', 'unlocked-podcast', 'website-lead']
  };

  const tags = TAG_MAP[type] || ['newsletter-subscriber', 'website-lead'];

  // Reuses the same GHL webhook as contact form, separated by tags in GHL workflows
  const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/imHfi70hPr9q2dnxwMmK/webhook-trigger/PXzpvApyS47ABmOVYre0';

  const payload = {
    email: email,
    firstName: '',
    lastName: '',
    source: source || (type === 'podcast-waitlist' ? 'Podcast Waitlist' : 'Newsletter Signup'),
    tags: tags,
    customField: {
      signup_type: type || 'newsletter',
      signup_source: source || 'website'
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
      return res.status(500).json({ error: 'Failed to process signup' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('GHL webhook error:', error);
    return res.status(500).json({ error: 'Failed to process signup' });
  }
};
