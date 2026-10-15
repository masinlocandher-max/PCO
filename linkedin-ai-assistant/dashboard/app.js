/* Reads the local API and renders whichever view this page declares.
   No framework: four views over six endpoints does not need one, and a
   dependency-free dashboard is one that still opens in three years. */
const view = document.body.dataset.view;
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || ('request failed: ' + res.status));
  return body;
}

function empty(title, note) {
  return `<div class="empty"><strong>${esc(title)}</strong><span>${esc(note)}</span></div>`;
}

async function banner() {
  try {
    const h = await api('/api/health');
    const unfilled = h.memory.unfilled_fields_total;
    const bits = [];
    bits.push(unfilled
      ? `<b>${unfilled} memory fields still need you.</b> Until they are filled the assistant must not speak with authority about them.`
      : `<b>Memory is complete.</b>`);
    bits.push(h.publish_mode === 'official_linkedin_api'
      ? (h.linkedin && h.linkedin.can_publish_via_api
          ? '<b>Official API mode is live.</b> Approved posts can be published through LinkedIn\'s API.'
          : 'Official API mode selected but not ready: ' + esc((h.linkedin && h.linkedin.outstanding || []).join('; ')) + '.')
      : '<b>Prepare-and-paste mode.</b> Approved posts are handed to you to publish — nothing is sent from here.');
    bits.push(h.external_actions_allowed
      ? (h.dry_run ? 'External actions allowed, execution in dry run.'
                   : '<b>Execution armed.</b>')
      : 'External actions blocked.');
    bits.push(`Approvals recorded as: ${esc(h.operator)}`);
    $('#banner').innerHTML = bits.join(' ');
  } catch (e) { $('#banner').textContent = 'Could not reach the local service: ' + e.message; }
}

const renderers = {
  async approvals() {
    const rows = await api('/api/approvals?status=pending_review');
    if (!rows.length) return empty('Nothing waiting', 'No action is pending your decision.');
    return rows.map(r => `
      <article class="card" data-id="${r.id}">
        <h3>${esc(r.subject)}</h3>
        <div class="meta">
          <span class="pill ${esc(r.risk)}">${esc(r.risk)} risk</span>
          <span>${esc(r.action_type.replace(/_/g,' '))}</span>
          <span>${esc(r.target || 'own feed')}</span>
          <span>drafted ${esc(r.created_at)}</span>
        </div>
        ${r.risk_notes ? `<p class="meta">${esc(r.risk_notes)}</p>` : ''}
        <div class="payload">${esc(r.payload)}</div>
        <p class="meta">${r.payload.length} characters — this exact text is what would be sent.</p>
        <div class="row">
          <button class="yes" data-decide="approve" data-id="${r.id}">Approve</button>
          <button class="no" data-decide="reject" data-id="${r.id}">Reject</button>
        </div>
      </article>`).join('');
  },

  async content() {
    const rows = await api('/api/content');
    if (!rows.length) return empty('No content yet', 'Drafts saved by the assistant appear here.');
    return `<table><thead><tr><th>Planned</th><th>Title</th><th>Objective</th>
      <th>Audience</th><th>Status</th></tr></thead><tbody>` +
      rows.map(r => `<tr>
        <td>${esc(r.scheduled_for || '—')}</td>
        <td>${esc(r.title || '(untitled)')}<br><span class="meta">${esc(r.kind)}</span></td>
        <td>${esc(r.objective)}</td>
        <td>${esc(r.audience)}</td>
        <td>${esc(r.status)}</td></tr>`).join('') + '</tbody></table>';
  },

  async crm() {
    const [contacts, opps] = await Promise.all([api('/api/contacts'), api('/api/opportunities')]);
    let html = '';
    html += '<h3 style="font-family:var(--serif);font-weight:400">Relationships</h3>';
    html += contacts.length ? `<table><thead><tr><th>Name</th><th>Where</th><th>Stage</th>
      <th>Follow up</th><th>Notes</th></tr></thead><tbody>` +
      contacts.map(c => `<tr><td>${esc(c.full_name)}</td><td>${esc(c.organisation || '—')}</td>
        <td>${esc(c.relationship)}</td><td>${esc(c.follow_up_on || '—')}</td>
        <td>${esc(c.notes || '')}</td></tr>`).join('') + '</tbody></table>'
      : empty('No relationships tracked', 'The engagement agent records people here as you meet them.');
    html += '<h3 style="margin-top:26px;font-family:var(--serif);font-weight:400">Opportunities</h3>';
    html += opps.length ? `<table><thead><tr><th>Opportunity</th><th>Stage</th>
      <th class="num">Score</th><th>Reading</th><th>Next step</th></tr></thead><tbody>` +
      opps.map(o => `<tr><td>${esc(o.title)}<br><span class="meta">${esc(o.score_rationale || '')}</span></td>
        <td>${esc(o.stage)}</td><td class="num">${o.total} / 20</td>
        <td>${esc(o.reading)}${o.veto ? '<br><span class="meta">' + esc(o.veto) + '</span>' : ''}</td>
        <td>${esc(o.next_step || '—')}${o.next_step_on ? '<br><span class="meta">' + esc(o.next_step_on) + '</span>' : ''}</td>
      </tr>`).join('') + '</tbody></table>'
      : empty('No opportunities scored', 'Scored opportunities appear here, highest first.');
    return html;
  },

  async analytics() {
    const rows = await api('/api/analytics');
    if (!rows.length) {
      return empty('No measurements yet',
        'Every number here is entered by hand or imported. Nothing is estimated, so an empty table means nothing has been measured — not that nothing happened.');
    }
    const max = Math.max(...rows.map(r => r.impressions || 0), 1);
    return `<p class="meta">${rows.length} measurement${rows.length === 1 ? '' : 's'}. ` +
      (rows.length < 5 ? 'Too few to read as a trend — this is a list, not a direction.' : '') + '</p>' +
      `<table><thead><tr><th>Measured</th><th>Post</th><th class="num">Impressions</th>
      <th class="num">Reactions</th><th class="num">Comments</th><th>Source</th></tr></thead><tbody>` +
      rows.map(r => `<tr><td>${esc(r.measured_on)}</td>
        <td>${esc(r.title || 'content #' + r.content_id)}
          <div class="bar"><i style="width:${Math.round((r.impressions || 0) / max * 100)}%"></i></div></td>
        <td class="num">${r.impressions ?? '—'}</td><td class="num">${r.reactions ?? '—'}</td>
        <td class="num">${r.comments ?? '—'}</td><td>${esc(r.source)}</td></tr>`).join('') +
      '</tbody></table>';
  },
};

async function render() {
  const host = $('#view');
  try { host.innerHTML = await renderers[view](); }
  catch (e) { host.innerHTML = empty('Could not load', e.message); }
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-decide]');
  if (!btn) return;
  btn.disabled = true;
  const notes = btn.dataset.decide === 'reject'
    ? (prompt('Why are you rejecting this? (optional)') || null) : null;
  try {
    await api('/api/decide', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approval_id: Number(btn.dataset.id), decision: btn.dataset.decide, notes }),
    });
    await render();
  } catch (err) { alert(err.message); btn.disabled = false; }
});

banner();
render();
