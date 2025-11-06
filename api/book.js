// /api/book.js — Create Outlook event + Teams link via Microsoft Graph
// Secrets KHÔNG để trong code. Backend sẽ nhận:
// - x-api-key: từ Vercel env
// - Authorization: Bearer <delegated access token> (MSAL)
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method Not Allowed' });

    if (req.headers['x-api-key'] !== process.env.API_KEY)
      return res.status(401).json({ ok:false, error:'Unauthorized' });

    const bearer = req.headers['authorization'] || '';
    if (!bearer.startsWith('Bearer '))
      return res.status(401).json({ ok:false, error:'Missing Bearer token' });
    const accessToken = bearer.split(' ')[1];

    const { subject, startTime, endTime, attendeeEmail, attendeeName, bodyHtml, location } = req.body || {};
    if (!subject || !startTime || !endTime || !attendeeEmail || !attendeeName)
      return res.status(400).json({ ok:false, error:'Missing required fields' });

    const pickTZ = (iso) => iso.endsWith('Z') ? 'UTC' : (iso.includes('+07:00') ? 'Asia/Ho_Chi_Minh' : 'UTC');

    const eventBody = {
      subject,
      body: bodyHtml ? { contentType: "HTML", content: bodyHtml } : undefined,
      start: { dateTime: startTime, timeZone: pickTZ(startTime) },
      end:   { dateTime: endTime,   timeZone: pickTZ(endTime) },
      location: location ? { displayName: location } : undefined,
      attendees: [{ emailAddress: { address: attendeeEmail, name: attendeeName }, type: "required" }],
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness"
    };

    const r = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody)
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ ok:false, error:'Graph error', details:data });

    return res.status(200).json({
      ok: true,
      eventId: data.id,
      subject: data.subject,
      start: data.start,
      end: data.end,
      attendees: data.attendees,
      joinUrl: data?.onlineMeeting?.joinUrl || null
    });
  } catch (e) {
    return res.status(500).json({ ok:false, error:'Server error', details:String(e) });
  }
}
