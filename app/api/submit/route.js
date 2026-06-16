function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function POST(request) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const NOTIFY_EMAIL   = process.env.NOTIFY_EMAIL || 'quintushelp@gmail.com'

  if (!RESEND_API_KEY) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // ── Parse request (JSON or multipart with branding file) ──────────────────
  let answers, brandingFile, brandingFileName

  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    answers = JSON.parse(formData.get('answers'))
    const file = formData.get('branding_file')
    if (file && file.size > 0) {
      brandingFile     = file
      brandingFileName = file.name
    }
  } else {
    answers = await request.json()
  }

  // ── Map new form fields ───────────────────────────────────────────────────
  const basics  = answers.business_basics  || {}
  const goal    = answers.goal             || {}
  const refs    = answers.references       || {}
  const contact = answers.contact_details  || {}
  const client  = answers.client_contact   || {}
  const branding = answers.branding        || {}

  const name       = basics.name         || 'Unknown'
  const type       = basics.what_you_do  || '—'
  const location   = basics.location     || '—'
  const customers  = answers.customers   || '—'
  const price      = answers.price_range || '—'
  const vibe       = answers.vibe        || '—'
  const goalText   = goal.goal           || '—'
  const cta        = goal.cta            || '—'
  const existing   = refs.existing_site  || 'none'
  const inspo      = refs.inspiration    || 'none'
  const phone      = contact.phone       || 'not provided'
  const address    = contact.address     || 'not provided'
  const hours      = contact.hours       || 'not provided'

  const brandingNote = branding.nobranding
    ? 'No branding — build from scratch'
    : brandingFileName
      ? `File uploaded: ${brandingFileName} (attached to this email)`
      : 'None provided'

  // ── Email body ───────────────────────────────────────────────────────────
  const row = (label, value) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap;vertical-align:top"><b>${escHtml(label)}</b></td><td style="padding:4px 0">${escHtml(value)}</td></tr>`

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="margin:0 0 16px">New client — ${escHtml(name)}</h2>

      <h3 style="margin:20px 0 6px">Business</h3>
      <table>
        ${row('Name', name)}
        ${row('Type', type)}
        ${row('Location', location)}
        ${row('Price range', price)}
      </table>

      <h3 style="margin:20px 0 6px">Customers</h3>
      <p style="margin:0">${escHtml(customers)}</p>

      <h3 style="margin:20px 0 6px">Vibe</h3>
      <p style="margin:0">${escHtml(vibe)}</p>

      <h3 style="margin:20px 0 6px">Website Goal</h3>
      <table>
        ${row('Goal', goalText)}
        ${row('CTA', cta)}
      </table>

      <h3 style="margin:20px 0 6px">References</h3>
      <table>
        ${row('Current site', existing)}
        ${row('Inspiration', inspo)}
      </table>

      <h3 style="margin:20px 0 6px">Branding</h3>
      <p style="margin:0">${escHtml(brandingNote)}</p>

      <h3 style="margin:20px 0 6px">Contact Details</h3>
      <table>
        ${row('Phone', phone)}
        ${row('Address', address)}
        ${row('Hours', hours)}
      </table>

      <h3 style="margin:20px 0 6px">Client</h3>
      <table>
        ${row('Name', client.name  || 'not provided')}
        ${row('Email', client.email || 'not provided')}
        ${row('Phone', client.phone || 'not provided')}
      </table>

      <hr style="margin:24px 0;border:none;border-top:1px solid #ddd">
      <p style="color:#888;font-size:12px">Tell Sir O in chat when you're ready to build this client's site.</p>

      <details style="margin-top:16px">
        <summary style="cursor:pointer;color:#888;font-size:12px">Raw submission data</summary>
        <pre style="white-space:pre-wrap;font-size:11px;background:#f5f5f5;padding:10px;border-radius:4px">${escHtml(JSON.stringify(answers, null, 2))}</pre>
      </details>
    </div>
  `

  // ── Build email payload (with attachment if branding file provided) ───────
  const payload = {
    from: 'Quintus AI <onboarding@resend.dev>',
    to: [NOTIFY_EMAIL],
    subject: `New client — ${name}`,
    html,
  }

  if (brandingFile) {
    const buffer = Buffer.from(await brandingFile.arrayBuffer())
    payload.attachments = [{
      filename: brandingFileName,
      content: buffer.toString('base64'),
    }]
  }

  // ── Send email via Resend ───────────────────────────────────────────────────
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    return Response.json({ error: 'Failed to send notification' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
