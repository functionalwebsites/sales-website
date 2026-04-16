export async function sendProTokenEmail(env, email, token) {
  if (!env.SENDGRID_API_KEY || !env.EMAIL_FROM) {
    console.log(`Skipping Pro token email for ${email}: missing SENDGRID_API_KEY or EMAIL_FROM`);
    return;
  }

  const subject = 'Your Functional Websites Pro Token';
  const text = [
    'Welcome to Functional Websites Pro!',
    '',
    `Your Pro token: ${token}`,
    '',
    'To unlock Pro features:',
    '1. Open the Functional Websites Builder',
    '2. Click "Unlock Pro" in the top right',
    '3. Paste your token',
    '4. Click "Unlock Pro"',
    '',
    'Keep your token safe.',
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#4ade80;">Welcome to Functional Websites Pro</h2>
      <p>Thank you for your purchase. Your Pro token is ready to use.</p>
      <div style="background:#f5f5f5;border-left:4px solid #4ade80;padding:16px;margin:24px 0;">
        <strong>Your Pro Token</strong>
        <div style="font-family:monospace;background:#fff;padding:12px;margin-top:12px;word-break:break-all;color:#000;">${token}</div>
      </div>
      <p>Open the builder, click <strong>Unlock Pro</strong>, and paste the token above.</p>
    </div>
  `;

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: env.EMAIL_FROM },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error: ${response.status} ${errorText}`);
  }
}
