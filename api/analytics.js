const GA4_API = 'https://analyticsdata.googleapis.com/v1beta';
const PROPERTY_ID = '15173814748';

async function runReport(token, requestBody) {
  const r = await fetch(`${GA4_API}/properties/${PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`GA4 API error: ${err}`);
  }
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reportType, accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Missing accessToken' });
  }

  try {
    if (reportType === 'overview') {
      const [usersRes, pagesRes, sourcesRes] = await Promise.all([
        runReport(accessToken, {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
          ],
        }),
        runReport(accessToken, {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBy: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        }),
        runReport(accessToken, {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'sessions' }],
          orderBy: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        }),
      ]);

      const overview = {};
      if (usersRes.rows?.[0]) {
        const vals = usersRes.rows[0].metricValues;
        overview.totalUsers = vals[0]?.value;
        overview.newUsers = vals[1]?.value;
        overview.sessions = vals[2]?.value;
        overview.pageViews = vals[3]?.value;
        overview.bounceRate = vals[4]?.value;
        overview.avgSessionDuration = vals[5]?.value;
      }

      const topPages = (pagesRes.rows || []).map(r => ({
        path: r.dimensionValues[0]?.value,
        views: r.metricValues[0]?.value,
      }));

      const trafficSources = (sourcesRes.rows || []).map(r => ({
        source: r.dimensionValues[0]?.value,
        sessions: r.metricValues[0]?.value,
      }));

      return res.status(200).json({ overview, topPages, trafficSources });
    }

    if (reportType === 'daily') {
      const dailyRes = await runReport(accessToken, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
        orderBy: [{ dimension: { dimensionName: 'date' }, desc: false }],
      });

      const daily = (dailyRes.rows || []).map(r => ({
        date: r.dimensionValues[0]?.value,
        users: r.metricValues[0]?.value,
        sessions: r.metricValues[1]?.value,
        pageViews: r.metricValues[2]?.value,
      }));

      return res.status(200).json({ daily });
    }

    return res.status(400).json({ error: 'Unknown reportType' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
