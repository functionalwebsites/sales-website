/* No network requests, dependencies, or secret keys. Works over file://. */
(() => {
  'use strict';
  const KEY = 'fw-business-desk-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  const today = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
  const dateText = date => date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '—';
  const number = value => Math.max(0, Number(value) || 0);
  const cents = value => Math.round((number(value) + Number.EPSILON) * 100);
  const percent = value => Math.min(100, number(value));
  const money = (value, currency) => new Intl.NumberFormat('en-US', {style:'currency', currency}).format(value / 100);
  function totals(doc) {
    const subtotal = doc.items.reduce((sum, item) => sum + Math.round(cents(item.rate) * number(item.qty)), 0);
    const discount = Math.round(subtotal * percent(doc.discount) / 100);
    const tax = Math.round((subtotal - discount) * percent(doc.tax) / 100);
    const total = subtotal - discount + tax;
    const paid = doc.type === 'invoice' ? cents(doc.paid) : 0;
    return {subtotal, discount, tax, total, paid, balance: Math.max(0, total - paid), credit: Math.max(0, paid - total)};
  }
  function paymentLink(doc) {
    if (doc.paymentMode === 'none' || totals(doc).balance <= 0) return '';
    if (doc.paymentMode === 'custom') {
      try { const url = new URL(doc.paymentUrl); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
    }
    if (doc.currency !== 'USD' || totals(doc).balance < 100 || totals(doc).balance > 5000000) return '';
    const url = new URL('https://functionalwebsites.com/pay/');
    url.searchParams.set('amount', (totals(doc).balance / 100).toFixed(2));
    url.searchParams.set('for', [doc.type === 'quote' ? 'Quote' : 'Invoice', doc.number, doc.project ? '— ' + doc.project : ''].filter(Boolean).join(' '));
    return url.href;
  }
  let store = {version:1, activeId:'', documents:[]};
  let storageBlocked = false;
  let loadFailed = false;
  let toastTimer;
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500); }
  function validStore(data) {
    const texts = ['id','type','number','issued','due','currency','project','customer','email','address','paymentMode','paymentUrl','notes','business','businessDetails','website'];
    const numeric = (v, max) => (typeof v === 'number' || typeof v === 'string') && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= max;
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + 'T12:00:00').getTime());
    return data && data.version === 1 && typeof data.activeId === 'string' && Array.isArray(data.documents) && data.documents.length <= 2000 &&
      new Set(data.documents.map(d => d?.id)).size === data.documents.length && data.documents.every(d => d && texts.every(k => typeof d[k] === 'string' && d[k].length <= 50000) && d.id &&
      ['quote','invoice'].includes(d.type) && ['USD','CAD','EUR','GBP','AUD'].includes(d.currency) && ['website','custom','none'].includes(d.paymentMode) &&
      (!d.issued || validDate(d.issued)) && (!d.due || validDate(d.due)) && numeric(d.tax,100000000) && numeric(d.discount,100000000) && numeric(d.paid,100000000) &&
      Array.isArray(d.items) && d.items.length > 0 && d.items.length <= 500 && d.items.every(i => i && typeof i.description === 'string' && i.description.length <= 50000 && numeric(i.qty,100000) && numeric(i.rate,100000000)));
  }
  try { const saved = localStorage.getItem(KEY); if (saved) { const parsed = JSON.parse(saved); if (!validStore(parsed)) throw new Error('Invalid backup'); store = parsed; } }
  catch { loadFailed = true; storageBlocked = true; }
  const current = () => store.documents.find(d => d.id === store.activeId);
  function nextNumber(type) {
    const prefix = `${type === 'quote' ? 'Q' : 'INV'}-${new Date().getFullYear()}-`;
    let sequence = 1;
    for (const doc of store.documents) { if (doc.number.startsWith(prefix) && /^\d+$/.test(doc.number.slice(prefix.length))) sequence = Math.max(sequence, Number(doc.number.slice(prefix.length)) + 1); }
    return prefix + String(sequence).padStart(3, '0');
  }
  function newDocument(type, source) {
    const previous = current();
    const doc = source ? JSON.parse(JSON.stringify(source)) : {
      customer:'',email:'',address:'',project:'',currency:'USD',discount:0,tax:0,paid:0,
      business:previous?.business || 'Functional Websites',
      businessDetails:previous?.businessDetails || 'Cooper Carrasco\ncooper@functionalwebsites.com\n714-369-0148',
      website:previous?.website || 'functionalwebsites.com',
      paymentMode:previous?.paymentMode || 'website',paymentUrl:previous?.paymentUrl || '',
      notes:type === 'quote' ? 'This quote is valid until the date shown above. Please confirm the scope and payment schedule before work begins.\nThank you for considering Functional Websites.' : 'Thank you for your business. Please include the invoice number with your payment.',
      items:[{description:'Website design & development',qty:1,rate:0}]
    };
    Object.assign(doc, {id:uid(),type,number:nextNumber(type),issued:today(),due:today(type === 'quote' ? 30 : 14),paid:0});
    store.documents.unshift(doc); store.activeId = doc.id; persist(); hydrate();
  }
  function persist() {
    if (loadFailed) { $('#save-status').textContent = 'Storage unavailable · export backup'; return; }
    try { localStorage.setItem(KEY, JSON.stringify(store)); storageBlocked = false; $('#save-status').textContent = 'Saved locally'; }
    catch { storageBlocked = true; $('#save-status').textContent = 'Not saved · export backup'; }
  }
  function renderList() {
    $('#document-count').textContent = store.documents.length;
    const search = $('#search').value.toLowerCase();
    const documents = store.documents.filter(d => `${d.customer} ${d.number} ${d.project}`.toLowerCase().includes(search));
    $('#document-list').innerHTML = documents.map(d => `<button class="document-card ${d.id === store.activeId ? 'active' : ''}" data-open="${esc(d.id)}" ${d.id === store.activeId ? 'aria-current="true"' : ''}><strong>${esc(d.customer || 'New customer')}</strong><small><span>${d.type === 'quote' ? 'QUOTE' : 'INVOICE'} · ${esc(d.number)}</span></small><small><span>${dateText(d.issued)}</span><span class="doc-money">${money(totals(d).total,d.currency)}</span></small></button>`).join('') || '<p class="empty">No matching documents.</p>';
  }
  function renderItems() {
    $('#items').innerHTML = current().items.map((item,index) => `<div class="item-editor"><div class="item-head"><span>LINE ${String(index + 1).padStart(2,'0')}</span><button type="button" data-remove="${index}" aria-label="Remove line ${index+1}" ${current().items.length === 1 ? 'disabled' : ''}>×</button></div><label>Description<textarea rows="2" data-item="${index}" data-key="description" required>${esc(item.description)}</textarea></label><div class="grid2"><label>Quantity<input data-item="${index}" data-key="qty" type="number" min="0.01" max="100000" step="0.01" required value="${esc(item.qty)}"></label><label>Unit price<input data-item="${index}" data-key="rate" type="number" min="0" max="100000000" step="0.01" required value="${esc(item.rate)}"></label></div></div>`).join('');
  }
  function hydrate() {
    const doc = current();
    document.querySelectorAll('[data-field]').forEach(input => { input.value = doc[input.dataset.field]; });
    renderItems(); render();
  }
  function render() {
    const d = current(), t = totals(d), link = paymentLink(d), isQuote = d.type === 'quote';
    const m = value => money(value,d.currency);
    document.querySelectorAll('[data-type]').forEach(button => button.setAttribute('aria-pressed', button.dataset.type === d.type));
    $('#due-label').textContent = isQuote ? 'Valid until' : 'Due date';
    $('#convert').hidden = !isQuote; $('#paid-field').hidden = isQuote;
    $('#custom-link-field').hidden = d.paymentMode !== 'custom';
    $('[data-field="paymentUrl"]').required = d.paymentMode === 'custom';
    $('#payment-hint').textContent = d.paymentMode === 'custom' ? 'Use a public HTTPS payment link. Confirm its currency and amount match this document; this app cannot change a Stripe link’s price.' : d.paymentMode === 'website' ? (d.currency === 'USD' ? (t.balance > 0 && (t.balance < 100 || t.balance > 5000000) ? 'Your payment page accepts $1–$50,000. Select a matching custom link or no payment link for this amount.' : 'Prefills the amount and document reference. Your payment page accepts $1–$50,000 USD; customers review the amount before Stripe.') : 'Your payment page accepts USD only. Add a matching payment link or choose no payment link.') : 'No online payment link will appear on this document.';
    $('#copy-link').disabled = !link;
    const row = (label,value,css='') => `<div class="total-row ${css}"><span>${label}</span><span>${value}</span></div>`;
    $('#paper').innerHTML = `<header class="paper-top"><div class="paper-brand"><span class="brand-symbol"><img src="assets/gear.svg" alt=""></span>${esc(d.business || 'Your business')}<div class="paper-details multiline">${esc(d.businessDetails)}</div></div><div class="paper-kind"><h2>${isQuote ? 'Quote' : 'Invoice'}</h2><p>${esc(d.number || 'Draft')}</p></div></header>
    <div class="paper-meta"><div><div class="small-label">${isQuote ? 'Prepared for' : 'Bill to'}</div><strong>${esc(d.customer || 'Customer name')}</strong><div class="paper-details multiline">${esc([d.email,d.address].filter(Boolean).join('\n'))}</div></div><div class="paper-dates"><div><div class="small-label">Issued</div>${dateText(d.issued)}</div>${d.due ? `<div><div class="small-label">${isQuote ? 'Valid until' : 'Payment due'}</div>${dateText(d.due)}</div>` : ''}<div><div class="small-label">Currency</div>${d.currency}</div></div></div>
    ${d.project ? `<div class="paper-project"><div class="small-label">Project</div><strong>${esc(d.project)}</strong></div>` : ''}
    <table aria-label="Line items"><thead><tr><th>Service / description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${d.items.map(i => `<tr><td class="multiline">${esc(i.description || 'Service description')}</td><td>${number(i.qty)}</td><td>${m(cents(i.rate))}</td><td>${m(Math.round(cents(i.rate)*number(i.qty)))}</td></tr>`).join('')}</tbody></table>
    <div class="totals">${row('Subtotal',m(t.subtotal))}${t.discount ? row(`Discount (${percent(d.discount)}%)`,'−' + m(t.discount)) : ''}${row(`Tax (${percent(d.tax)}%)`,m(t.tax))}${row(isQuote ? 'Quote total' : 'Total',m(t.total),'grand')}${!isQuote && t.paid ? row('Already paid','−' + m(t.paid)) : ''}${!isQuote ? `<div class="balance"><span>${t.credit ? 'Credit balance' : 'Balance due'}</span><span>${m(t.credit || t.balance)}</span></div>` : ''}</div>
    ${link ? `<div class="payment-box"><div class="small-label">${isQuote ? 'Payment after approval' : 'Ready when you are'}</div><a href="${esc(link)}" target="_blank" rel="noopener">${isQuote ? 'Review payment options' : 'Pay online'} ↗</a><p>${isQuote ? 'This is a quote, not a request for payment. Confirm approval and payment terms before paying.' : 'Please use the document number as your payment reference.'}</p><a class="payment-url" href="${esc(link)}">${esc(link)}</a></div>` : ''}
    ${d.notes ? `<section class="notes"><div class="small-label">${isQuote ? 'Terms & next steps' : 'Notes & payment terms'}</div><div class="multiline">${esc(d.notes)}</div></section>` : ''}
    <footer class="paper-footer">${esc(d.website)}${d.website ? ' · ' : ''}${isQuote ? 'Thank you for the opportunity to work together.' : 'Thank you for supporting independent web development.'}</footer>`;
    renderList();
  }
  $('#editor').addEventListener('submit', event => event.preventDefault());
  $('#editor').addEventListener('input', event => {
    const input = event.target;
    if (input.dataset.field) current()[input.dataset.field] = input.value;
    else if (input.dataset.item !== undefined) current().items[Number(input.dataset.item)][input.dataset.key] = input.value;
    else return;
    persist(); render();
  });
  $('#items').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button || current().items.length <= 1) return;
    current().items.splice(Number(button.dataset.remove),1); persist(); renderItems(); render();
  });
  $('#add-item').addEventListener('click', () => {
    if (current().items.length >= 500) return toast('Maximum 500 line items per document.');
    current().items.push({description:'',qty:1,rate:0}); persist(); renderItems(); render();
    $('#items').lastElementChild.querySelector('textarea').focus();
  });
  $('#document-list').addEventListener('click', event => {
    const button = event.target.closest('[data-open]'); if (!button) return;
    store.activeId = button.dataset.open; persist(); hydrate();
  });
  $('#search').addEventListener('input', renderList);
  document.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click', () => {
    const d = current(); if (d.type === button.dataset.type) return;
    if (d.type === 'invoice' && number(d.paid) > 0) return toast('Duplicate this invoice before changing its type; it has a payment recorded.');
    if (!confirm('Change this document’s type and assign a new number? To keep the original quote, use Convert to invoice instead.')) return;
    d.type = button.dataset.type; d.number = nextNumber(d.type); persist(); hydrate();
  }));
  $('#new-document').addEventListener('click', () => $('#new-dialog').showModal());
  $('#new-dialog').addEventListener('close', () => { const type = $('#new-dialog').returnValue; if (['quote','invoice'].includes(type)) { $('#search').value=''; newDocument(type); } });
  $('#duplicate').addEventListener('click', () => { newDocument(current().type,current()); toast('Copy created with a new number. Recorded payments were reset.'); });
  $('#convert').addEventListener('click', () => {
    const quote = current(); newDocument('invoice',quote);
    current().notes = `Based on quote ${quote.number}.\nThank you for your business. Please include the invoice number with your payment.`;
    persist(); hydrate(); toast('Invoice created. Your original quote is preserved.');
  });
  $('#delete').addEventListener('click', () => {
    if (!confirm(`Delete ${current().number}? This cannot be undone. Export a backup first if needed.`)) return;
    store.documents = store.documents.filter(d => d.id !== store.activeId);
    if (!store.documents.length) newDocument('quote'); else { store.activeId = store.documents[0].id; persist(); hydrate(); }
  });
  $('#print').addEventListener('click', () => {
    if (!$('#editor').reportValidity()) return;
    const d = current();
    if (d.due && d.due < d.issued) return toast('The due / expiry date must be on or after the issue date.');
    if (d.paymentMode === 'custom' && !paymentLink(d) && totals(d).balance > 0) return toast('Enter a valid HTTPS payment link.');
    if (d.paymentMode === 'website' && d.currency !== 'USD') return toast('For this currency, select a matching custom payment link or no payment link.');
    if (d.paymentMode === 'website' && totals(d).balance > 0 && !paymentLink(d)) return toast('Your payment page accepts $1–$50,000 USD. Select a custom payment link or no link.');
    const oldTitle = document.title;
    document.title = `${d.number} - ${d.customer}`.replace(/[<>:"/\\|?*]/g,'-');
    window.addEventListener('afterprint', () => {document.title = oldTitle;}, {once:true});
    window.print();
  });
  $('#copy-link').addEventListener('click', async () => {
    const link = paymentLink(current()); if (!link) return;
    try { await navigator.clipboard.writeText(link); toast('Payment link copied.'); }
    catch { prompt('Copy this payment link:',link); }
  });
  $('#backup').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(store,null,2)],{type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download=`functional-websites-backup-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url),1000); toast('Backup exported. Keep it somewhere safe.');
  });
  $('#restore').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 10000000) throw new Error('Backup must be smaller than 10 MB.');
      const imported = JSON.parse(await file.text());
      if (!validStore(imported) || !imported.documents.length) throw new Error('This is not a valid Business Desk backup.');
      if (!confirm(`Import ${imported.documents.length} documents? Copies will be added; existing documents will be kept.`)) return;
      if (store.documents.length + imported.documents.length > 2000) throw new Error('Maximum 2,000 documents.');
      for (const d of imported.documents) d.id = uid();
      store.documents.unshift(...imported.documents); store.activeId = imported.documents[0].id;
      persist(); hydrate(); toast(storageBlocked ? 'Imported in memory. Export a backup before closing.' : 'Backup imported. Existing documents were kept.');
    } catch (error) { toast(error instanceof SyntaxError ? 'That file is not valid JSON.' : error.message); }
    finally { event.target.value = ''; }
  });
  if (!store.documents.length) newDocument('quote');
  else { if (!current()) store.activeId = store.documents[0].id; hydrate(); }
  if (storageBlocked) { $('#save-status').textContent = 'Not saved · export backup'; toast('Browser storage could not be read or saved. Export a backup before closing. Existing stored data was left untouched.'); }
  // Shared pure functions for the local regression suite.
  if (globalThis.__FW_TEST__) globalThis.__FW_TEST__.api = {totals,paymentLink,validStore};
})();
