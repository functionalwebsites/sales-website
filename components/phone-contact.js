(function () {
  if (window.__fwPhoneContactBound) return;
  window.__fwPhoneContactBound = true;

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/styles/phone-contact.css';
  document.head.append(stylesheet);

  const hoursFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', hourCycle: 'h23'
  });
  function isBusinessOpen(now) {
    const parts = Object.fromEntries(hoursFormatter.formatToParts(now).map(part => [part.type, part.value]));
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(parts.weekday) && Number(parts.hour) >= 9 && Number(parts.hour) < 17;
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'fw-phone-dialog';
  dialog.setAttribute('aria-labelledby', 'fw-phone-title');
  dialog.setAttribute('aria-describedby', 'fw-phone-message fw-phone-hours');
  dialog.innerHTML = `
    <button type="button" class="fw-phone-close" aria-label="Close contact options" autofocus>×</button>
    <p class="fw-phone-eyebrow">Functional Websites</p>
    <h2 id="fw-phone-title">Call or Text <span class="fw-business-status" data-business-status></span></h2>
    <p class="fw-phone-number">714-988-3466</p>
    <p id="fw-phone-hours">Monday–Friday, 9 AM–5 PM Pacific</p>
    <p id="fw-phone-message"></p>
    <div class="fw-phone-actions"><a href="tel:+17149883466">Call</a><a href="sms:+17149883466">Text</a></div>`;
  document.body.append(dialog);
  const message = dialog.querySelector('#fw-phone-message');
  function updateStatus() {
    const open = isBusinessOpen(new Date());
    const roots = [document, ...Array.from(document.querySelectorAll('#footer-placeholder')).map(el => el.shadowRoot).filter(Boolean)];
    roots.forEach(root => root.querySelectorAll('[data-business-status]').forEach(badge => {
      const label = open ? 'Open' : 'Closed';
      if (badge.textContent !== label) badge.textContent = label;
      badge.dataset.open = String(open);
      badge.title = 'Monday–Friday, 9 AM–5 PM Pacific';
    }));
    const statusMessage = open
      ? 'We’re open. Give us a call or send us a text—we’d love to hear from you.'
      : 'It’s currently outside of business hours, but feel free to text or leave a message and we’ll get back to you shortly.';
    if (message.textContent !== statusMessage) message.textContent = statusMessage;
  }
  let trigger;
  document.addEventListener('click', event => {
    const button = event.composedPath().find(el => el.matches?.('[data-phone-contact]'));
    if (!button) return;
    trigger = button;
    updateStatus();
    if (!dialog.open) dialog.showModal();
  });
  dialog.querySelector('.fw-phone-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => trigger?.focus());
  document.addEventListener('visibilitychange', updateStatus);
  updateStatus();
  setInterval(updateStatus, 1000);
})();
