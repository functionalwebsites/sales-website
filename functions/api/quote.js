import { sendEmail, escapeHtml } from '../_utils/email.js';
import { handleOptions, json } from '../_utils/http.js';

const OWNER_EMAIL = 'cooper@functionalwebsites.com';
const HOURLY_RATE = 150;
const ALLOWED_SERVICES = new Set([
  'simple-clone',
  'new-static-site',
  'rebuild-existing-site',
  'custom-templates-blocks',
  'custom-system',
]);

function clean(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value.map(item => clean(item, 120)).filter(Boolean) : [];
}

function money(value) {
  return `$${value.toLocaleString('en-US')}`;
}

function estimateQuote(data) {
  const service = clean(data.service);
  const pages = Number(data.pages || 1);
  const features = asArray(data.features);
  const contentStatus = clean(data.contentStatus);
  const designStatus = clean(data.designStatus);
  const timeline = clean(data.timeline);
  const easyToEdit = Boolean(data.easyToEdit);

  if (service === 'simple-clone' && !easyToEdit) {
    return {
      tier: 'simple-clone',
      label: 'Simple website clone',
      hoursLow: null,
      hoursHigh: null,
      priceLow: 500,
      priceHigh: null,
      summary: 'Flat $500 for a simple exact static copy of your existing website.',
    };
  }

  let score = 0;
  if (service === 'new-static-site') score += 2;
  if (service === 'rebuild-existing-site') score += 3;
  if (service === 'simple-clone' && easyToEdit) score += 3;
  if (service === 'custom-templates-blocks') score += 3;
  if (service === 'custom-system') score += 8;

  if (pages >= 4) score += 2;
  if (pages >= 8) score += 3;
  if (pages >= 15) score += 6;
  if (features.includes('contact-form')) score += 1;
  if (features.includes('blog')) score += 2;
  if (features.includes('payments')) score += 4;
  if (features.includes('booking')) score += 3;
  if (features.includes('deploy-hosting')) score += 2;
  if (features.includes('custom-code')) score += 6;
  if (contentStatus === 'needs-writing') score += 3;
  if (designStatus === 'needs-design') score += 3;
  if (timeline === 'rush') score += 2;

  if (score >= 11) {
    return {
      tier: 'large',
      label: 'Large custom project',
      hoursLow: 100,
      hoursHigh: null,
      priceLow: HOURLY_RATE * 100,
      priceHigh: null,
      summary: '100+ hours. This needs a custom review before a real quote.',
    };
  }

  if (score >= 6) {
    return {
      tier: 'medium',
      label: 'Medium website project',
      hoursLow: 40,
      hoursHigh: 80,
      priceLow: HOURLY_RATE * 40,
      priceHigh: HOURLY_RATE * 80,
      summary: 'Roughly 40-80 hours for a medium build.',
    };
  }

  return {
    tier: 'basic',
    label: 'Basic website project',
    hoursLow: 10,
    hoursHigh: 25,
    priceLow: HOURLY_RATE * 10,
    priceHigh: HOURLY_RATE * 25,
    summary: 'Roughly 10-25 hours for a basic static site.',
  };
}

function serviceLabel(value) {
  return {
    'simple-clone': 'Simple clone - copy my website exactly',
    'new-static-site': 'New static website',
    'rebuild-existing-site': 'Rebuild or clone an existing site',
    'custom-templates-blocks': 'Custom builder templates or blocks',
    'custom-system': 'Larger custom system',
  }[value] || value || 'Not specified';
}

function optionLabel(value, labels) {
  return labels[value] || value || 'Not specified';
}

function featureLabels(features) {
  const labels = {
    'contact-form': 'Contact form',
    blog: 'Blog/articles',
    payments: 'Payments or checkout',
    booking: 'Booking/scheduling',
    'deploy-hosting': 'Hosting/deployment help',
    'custom-code': 'Custom code/workflows',
  };

  return features.map(feature => labels[feature] || feature).join(', ');
}

function fieldRows(data, estimate) {
  const contentLabels = {
    ready: 'I have most content ready',
    'some-ready': 'Some content is ready',
    'needs-writing': 'I need writing/content help',
  };
  const designLabels = {
    'has-brand': 'I have brand/design direction',
    'some-direction': 'I have some examples',
    'needs-design': 'I need design direction',
  };
  const timelineLabels = {
    flexible: 'Flexible',
    soon: 'Soon, but not urgent',
    rush: 'Rush / urgent',
  };
  const budgetLabels = {
    '1500-3000': '$1,500-$3,000',
    '3000-6000': '$3,000-$6,000',
    '6000-12000': '$6,000-$12,000',
    '12000-plus': '$12,000+',
  };

  const features = asArray(data.features);
  const rows = [
    ['Name', clean(data.name, 160)],
    ['Email', clean(data.email, 220)],
    ['Phone', clean(data.phone, 80)],
    ['Business / Project', clean(data.business, 180)],
    ['Service', serviceLabel(clean(data.service))],
    ['Make clone easy to edit', data.easyToEdit ? 'Yes' : 'No'],
    ['Pages', clean(data.pages, 20)],
    ['Existing URL', clean(data.existingUrl, 300)],
    ['Content status', optionLabel(clean(data.contentStatus, 120), contentLabels)],
    ['Design / brand status', optionLabel(clean(data.designStatus, 120), designLabels)],
    ['Timeline', optionLabel(clean(data.timeline, 120), timelineLabels)],
    ['Budget range', optionLabel(clean(data.budget, 120), budgetLabels)],
    ['Features', featureLabels(features) || 'None selected'],
    ['Notes', clean(data.notes, 2400)],
    ['Rough estimate', estimate.hoursHigh
      ? `${estimate.hoursLow}-${estimate.hoursHigh} hours (${money(estimate.priceLow)}-${money(estimate.priceHigh)})`
      : estimate.hoursLow
        ? `${estimate.hoursLow}+ hours (${money(estimate.priceLow)}+)`
        : money(estimate.priceLow)],
  ];

  return rows.map(([label, value]) => ({ label, value: value || 'Not provided' }));
}

function itemizedWork(estimate) {
  if (estimate.tier === 'simple-clone') {
    return [
      'Copy the existing website as a static HTML/CSS version',
      'Preserve the current look, content, and page structure as closely as practical',
      'Collect and organize the copied assets',
      'Basic mobile and desktop spot check',
      'Static file export and handoff',
    ];
  }

  const base = [
    'Discovery and scope review',
    'Page structure and content organization',
    'Visual layout and responsive styling',
    'Static HTML/CSS build or builder-ready setup',
    'SEO basics, metadata, and social sharing checks',
    'Testing, export, and deployment guidance',
  ];

  if (estimate.tier !== 'basic') {
    base.splice(4, 0, 'Custom sections, integrations, or reusable templates');
  }

  if (estimate.tier === 'large') {
    base.splice(1, 0, 'Technical planning for custom workflows or complex requirements');
  }

  return base;
}

function estimateText(estimate) {
  if (estimate.tier === 'simple-clone') {
    return `${estimate.label}: flat ${money(estimate.priceLow)} for a simple exact static copy. This does not include reorganizing the site to be easy to edit.`;
  }

  if (estimate.hoursHigh) {
    return `${estimate.label}: ${estimate.hoursLow}-${estimate.hoursHigh} hours at $${HOURLY_RATE}/hour, roughly ${money(estimate.priceLow)}-${money(estimate.priceHigh)}.`;
  }
  return `${estimate.label}: ${estimate.hoursLow}+ hours at $${HOURLY_RATE}/hour, starting around ${money(estimate.priceLow)}. We will review this manually before giving a real quote.`;
}

function buildEmailContent(data, estimate, rows) {
  const work = itemizedWork(estimate);
  const requesterName = clean(data.name, 160) || 'there';
  const rowsText = rows.map(row => `${row.label}: ${row.value}`).join('\n');
  const workText = work.map(item => `- ${item}`).join('\n');
  const escapedRows = rows.map(row => `
    <tr>
      <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #10100d;width:34%;">${escapeHtml(row.label)}</th>
      <td style="padding:8px 10px;border-bottom:1px solid #10100d;">${escapeHtml(row.value)}</td>
    </tr>
  `).join('');
  const escapedWork = work.map(item => `<li>${escapeHtml(item)}</li>`).join('');

  const ownerSubject = `Quote request: ${serviceLabel(clean(data.service))}`;
  const customerSubject = 'Functional Websites quote request received';

  const ownerText = [
    'New Functional Websites quote request',
    '',
    rowsText,
    '',
    'Itemized work estimate:',
    workText,
  ].join('\n');

  const customerText = [
    `Hi ${requesterName},`,
    '',
    'Thanks for requesting a quote from Functional Websites. This is an automatic recap of what you sent.',
    '',
    estimateText(estimate),
    '',
    'Typical work included:',
    workText,
    '',
    'Your request:',
    rowsText,
    '',
    'This is a rough estimate, not a final quote. Cooper will review your request and follow up.',
  ].join('\n');

  const sharedHtml = `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#10100d;line-height:1.55;">
      <div style="background:#f5efe0;border:3px solid #10100d;padding:20px;">
        <h1 style="margin:0 0 10px;color:#b9482e;text-transform:uppercase;">Quote Request</h1>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(estimateText(estimate))}</strong></p>
        <h2 style="font-size:18px;margin:18px 0 8px;">Typical work included</h2>
        <ul>${escapedWork}</ul>
        <h2 style="font-size:18px;margin:18px 0 8px;">Request details</h2>
        <table style="border-collapse:collapse;width:100%;background:#fff;">${escapedRows}</table>
      </div>
    </div>
  `;

  return {
    owner: { subject: ownerSubject, text: ownerText, html: sharedHtml },
    customer: {
      subject: customerSubject,
      text: customerText,
      html: sharedHtml.replace('Quote Request', `Thanks, ${escapeHtml(requesterName)}`),
    },
  };
}

export async function onRequest(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  if (context.request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const data = await context.request.json();
    if (clean(data.company)) return json({ ok: true });

    const email = clean(data.email, 220);
    const phone = clean(data.phone, 80);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: 'A valid email is required.' }, 400);
    }
    if (phone.replace(/\D/g, '').length < 10) {
      return json({ ok: false, error: 'A valid phone number is required.' }, 400);
    }
    if (!ALLOWED_SERVICES.has(clean(data.service))) {
      return json({ ok: false, error: 'Please choose a service.' }, 400);
    }

    const estimate = estimateQuote(data);
    const rows = fieldRows(data, estimate);
    const content = buildEmailContent(data, estimate, rows);

    await Promise.all([
      sendEmail(context.env, { to: OWNER_EMAIL, ...content.owner }),
      sendEmail(context.env, { to: email, ...content.customer }),
    ]);

    return json({
      ok: true,
      estimate: {
        label: estimate.label,
        summary: estimate.summary,
        hoursLow: estimate.hoursLow,
        hoursHigh: estimate.hoursHigh,
        priceLow: estimate.priceLow,
        priceHigh: estimate.priceHigh,
        itemizedWork: itemizedWork(estimate),
      },
    });
  } catch (error) {
    console.error('Quote request failed:', error);
    return json({ ok: false, error: 'Quote request failed. Please email cooper@functionalwebsites.com directly.' }, 500);
  }
}
