// /api/sendMail.js — Send email via Microsoft Graph (HTML + attachments base64 optional)
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method Not Allowed' });

    if (req.headers['x-api-key'] !== process.env.API_KEY)
      return res.status(401).json({ ok:false, error:'Unauthorized' });

    const bearer = req.headers['authorization'] || '';
    if (!bearer.startsWith('Bearer '))
      return res.status(401).json({ ok:false, error:'Missing Bearer token' });
    const accessToken = bearer.split(' ')[1];

    const { to, cc, bcc, subject, htmlBody, attachments } = req.body || {};
    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !htmlBody)
      return res.status(400).json({ ok:false, error:'Missing required fields' });

    const msg = {
      message: {
        subject,
        body: { contentType: "HTML", content: htmlBody },
        toRecipients: to.map(x => ({ emailAddress: { address: x } })),
        ccRecipients: (cc || []).map(x => ({ emailAddress: { address: x } })),
        bccRecipients: (bcc || []).map(x => ({ emailAddress: { address: x } })),
        attachments: (attachments || []).map(a => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: a.filename,
          contentType: a.contentType || "application/octet-stream",
          contentBytes: a.contentBase64 // base64 string, không có prefix data:
        }))
      },
      saveToSentItems: true
    };

    const r = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });

    if (r.status === 202) return res.status(200).json({ ok:true, status:'sent' });
    const data = await r.json().catch(()=> ({}));
    if (!r.ok) return res.status(r.status).json({ ok:false, error:'Graph error', details:data });

    return res.status(200).json({ ok:true, status:'sent' });
  } catch (e) {
    return res.status(500).json({ ok:false, error:'Server error', details:String(e) });
  }
}
