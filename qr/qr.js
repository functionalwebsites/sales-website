(() => {
  'use strict';
  const content = document.getElementById('content');
  const preview = document.getElementById('preview');
  const status = document.getElementById('qr-status');
  const color = document.getElementById('color');
  const size = document.getElementById('size');
  const pngButton = document.getElementById('download-png');
  const svgButton = document.getElementById('download-svg');
  const empty = preview.innerHTML;
  let current = null;
  let timer;
  const type = () => document.querySelector('input[name="type"]:checked').value;

  function invalidate(message, invalid = false) {
    current = null;
    preview.innerHTML = empty;
    pngButton.disabled = svgButton.disabled = true;
    content.setAttribute('aria-invalid', String(invalid));
    status.textContent = message;
  }

  function render() {
    clearTimeout(timer);
    const raw = content.value;
    if (!raw.trim()) return invalidate('Ready when you are.');
    if (typeof qrcode !== 'function') return invalidate('The QR generator couldn’t load. Please reload this page.');
    let value = raw;
    if (type() === 'url') {
      value = raw.trim();
      if (!/^https?:\/\//i.test(value)) {
        if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^[^\s/:]+:\d+(?:\/|$)/.test(value)) {
          return invalidate('Use a website link starting with https:// or http://.', true);
        }
        value = 'https://' + value;
      }
      try {
        const url = new URL(value);
        if (!url.hostname || /\s/.test(value) || url.username || url.password) throw new Error();
        value = url.href;
      } catch (_) { return invalidate('Enter a valid website link, like https://example.com.', true); }
    }
    // Keep codes practical to scan and bound expensive encoding work.
    if (new TextEncoder().encode(value).length > 2000) return invalidate('That’s too much content. Use a shorter link or text (up to 2,000 UTF-8 bytes).', true);
    try {
      const code = qrcode(0, 'M');
      code.addData(value, 'Byte');
      code.make();
      const count = code.getModuleCount();
      const extent = count + 8; // Four-module quiet zone on every side.
      let path = '';
      for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) {
        if (code.isDark(y, x)) path += `M${x + 4},${y + 4}h1v1h-1z`;
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${extent * 10}" height="${extent * 10}" viewBox="0 0 ${extent} ${extent}" role="img" aria-label="Generated QR code" shape-rendering="crispEdges"><rect width="${extent}" height="${extent}" fill="#fff"/><path d="${path}" fill="${color.value}"/></svg>`;
      current = { code, svg, extent, color: color.value };
      preview.innerHTML = svg;
      content.setAttribute('aria-invalid', 'false');
      status.textContent = type() === 'url' ? `Links to ${value}` : 'Your text is ready to scan.';
      pngButton.disabled = svgButton.disabled = false;
    } catch (_) { invalidate('This content won’t fit. Try a shorter link or text.', true); }
  }

  function download(blob, extension) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-code.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  content.addEventListener('input', () => {
    invalidate(content.value.trim() ? 'Updating your code…' : 'Ready when you are.');
    clearTimeout(timer);
    timer = setTimeout(render, 180);
  });
  document.querySelectorAll('input[name="type"]').forEach(input => input.addEventListener('change', () => {
    const isUrl = type() === 'url';
    document.getElementById('content-label').textContent = isUrl ? 'Where should your code go?' : 'What should your code say?';
    content.placeholder = isUrl ? 'https://yourwebsite.com' : 'Type a message, details, or anything you want to share.';
    document.getElementById('content-help').textContent = isUrl ? 'Paste a link. We’ll add https:// if you leave it out.' : 'Your text is stored directly in the code, including line breaks.';
    render();
  }));
  color.addEventListener('change', render);
  svgButton.addEventListener('click', () => {
    if (current) download(new Blob([current.svg], { type: 'image/svg+xml;charset=utf-8' }), 'svg');
  });
  pngButton.addEventListener('click', () => {
    if (!current) return;
    const snapshot = current;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Number(size.value);
    const ctx = canvas.getContext('2d');
    if (!ctx) { status.textContent = 'PNG export is unavailable. Try downloading SVG.'; return; }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.floor(canvas.width / snapshot.extent);
    const offset = Math.floor((canvas.width - snapshot.extent * scale) / 2) + 4 * scale;
    ctx.fillStyle = snapshot.color;
    for (let y = 0; y < snapshot.code.getModuleCount(); y++) for (let x = 0; x < snapshot.code.getModuleCount(); x++) {
      if (snapshot.code.isDark(y, x)) ctx.fillRect(offset + x * scale, offset + y * scale, scale, scale);
    }
    canvas.toBlob(blob => {
      if (blob) download(blob, 'png');
      else status.textContent = 'PNG export failed. Try downloading SVG.';
    }, 'image/png');
  });
  render();
})();
