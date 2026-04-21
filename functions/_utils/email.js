const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getEmailConfig(env) {
  return {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  };
}

function hasRequiredConfig(config) {
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function createEmailContent(token) {
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
        <div style="font-family:monospace;background:#fff;padding:12px;margin-top:12px;word-break:break-all;color:#000;">${escapeHtml(token)}</div>
      </div>
      <p>Open the builder, click <strong>Unlock Pro</strong>, and paste the token above.</p>
    </div>
  `;

  return { subject, text, html };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeHeader(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function normalizeMessageBody(value) {
  return String(value).replace(/\r?\n/g, '\r\n');
}

function dotStuff(value) {
  return value.replace(/\r\n\./g, '\r\n..');
}

function toBase64(value) {
  const bytes = textEncoder.encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/.{1,76}/g, '$&\r\n').trim();
}

function buildMimeMessage({ from, to, subject, text, html }) {
  const boundary = `fw-boundary-${crypto.randomUUID()}`;
  const plainBody = toBase64(normalizeMessageBody(text));
  const htmlBody = toBase64(normalizeMessageBody(html));

  return [
    `From: ${escapeHeader(from)}`,
    `To: ${escapeHeader(to)}`,
    `Subject: ${escapeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    plainBody,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlBody,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

class SmtpConnection {
  constructor(socket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
    this.buffer = '';
  }

  async readResponse() {
    while (true) {
      const lines = this.buffer.split('\r\n');

      for (let i = 0; i < lines.length - 1; i += 1) {
        const line = lines[i];
        if (/^\d{3} /.test(line)) {
          const code = Number(line.slice(0, 3));
          const consumed = lines.slice(0, i + 1).join('\r\n').length + 2;
          this.buffer = this.buffer.slice(consumed);
          return { code, line };
        }
      }

      const { value, done } = await this.reader.read();
      if (done) {
        throw new Error(`SMTP connection closed unexpectedly. Buffer: ${this.buffer}`);
      }
      this.buffer += textDecoder.decode(value, { stream: true });
    }
  }

  async expect(expectedCodes) {
    const allowedCodes = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
    const response = await this.readResponse();
    if (!allowedCodes.includes(response.code)) {
      throw new Error(`SMTP expected ${allowedCodes.join(' or ')} but received ${response.code}: ${response.line}`);
    }
    return response;
  }

  async send(line) {
    await this.writer.write(textEncoder.encode(`${line}\r\n`));
  }

  async sendData(message) {
    await this.writer.write(textEncoder.encode(`${dotStuff(message)}\r\n.\r\n`));
  }

  async upgradeToTls() {
    this.reader.releaseLock();
    this.writer.releaseLock();
    const secureSocket = this.socket.startTls();
    this.socket = secureSocket;
    this.reader = secureSocket.readable.getReader();
    this.writer = secureSocket.writable.getWriter();
    this.buffer = '';
  }

  async close() {
    try {
      await this.writer.close();
    } catch {
      // Ignore close errors while tearing down the socket.
    }

    try {
      this.reader.releaseLock();
      this.writer.releaseLock();
    } catch {
      // Ignore lock release errors during cleanup.
    }

    try {
      this.socket.close();
    } catch {
      // Ignore socket close errors during cleanup.
    }
  }
}

async function sendWithCloudflareSockets(config, email, content) {
  const { connect } = await import('cloudflare:sockets');
  console.log(`Opening SMTP connection to ${config.host}:${config.port} for ${email}`);
  const socket = connect(
    { hostname: config.host, port: config.port },
    { secureTransport: config.port === 465 ? 'on' : 'starttls' }
  );

  const connection = new SmtpConnection(socket);
  await socket.opened;

  try {
    await connection.expect(220);
    await connection.send('EHLO functionalwebsites.com');
    await connection.expect(250);

    if (config.port !== 465) {
      await connection.send('STARTTLS');
      await connection.expect(220);
      await connection.upgradeToTls();
      await connection.send('EHLO functionalwebsites.com');
      await connection.expect(250);
    }

    await connection.send('AUTH LOGIN');
    await connection.expect(334);
    await connection.send(toBase64(config.user));
    await connection.expect(334);
    await connection.send(toBase64(config.pass));
    await connection.expect(235);

    await connection.send(`MAIL FROM:<${config.from}>`);
    await connection.expect(250);
    await connection.send(`RCPT TO:<${email}>`);
    await connection.expect([250, 251]);
    await connection.send('DATA');
    await connection.expect(354);

    const message = buildMimeMessage({
      from: config.from,
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    await connection.sendData(message);
    const accepted = await connection.expect(250);
    console.log(`SMTP accepted email for ${email}: ${accepted.line}`);
    await connection.send('QUIT');
    await connection.expect(221);
  } finally {
    await connection.close();
  }
}

export async function sendProTokenEmail(env, email, token) {
  if (!env.EMAIL_FROM) {
    throw new Error('Missing EMAIL_FROM');
  }

  console.log(`Preparing Pro token email for ${email} from ${env.EMAIL_FROM}`);
  const content = createEmailContent(token);

  try {
    const result = await env.EMAIL.send({
      to: email,
      from: env.EMAIL_FROM,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    console.log(`Email sent successfully: ${result.messageId}`);
    return { sent: true };
  } catch (error) {
    console.error(`Email sending failed: ${error.code} - ${error.message}`);
    throw error;
  }
}
