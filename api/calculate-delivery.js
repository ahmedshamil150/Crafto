const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SVC_KEY = process.env.VITE_SUPABASE_SERVICE_KEY;

const LOCAL_CITIES = new Set(['rawalpindi', 'islamabad']);
const LOCAL_FLAT_FEE = 135;
const OUTSTATION_PER_KG = 150;
const MIN_OUTSTATION = 150;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city, cart } = req.body;
  if (!city) return res.status(400).json({ fee: 0 });

  if (LOCAL_CITIES.has(city)) {
    return res.status(200).json({ fee: LOCAL_FLAT_FEE, local: true });
  }

  // Outstation: sum weight_kg x qty across cart items
  let totalWeightKg = 0;
  if (cart && cart.length) {
    for (const item of cart) {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/products?id=eq.${item.id}&select=weight_kg`,
          { headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}` } }
        );
        const data = await r.json();
        const kg = parseFloat(data?.[0]?.weight_kg ?? 0);
        totalWeightKg += kg * (item.qty || 1);
      } catch { /* skip */ }
    }
    totalWeightKg = Math.round(totalWeightKg * 1000) / 1000;
  }

  const fee = totalWeightKg > 0
    ? Math.ceil(totalWeightKg * OUTSTATION_PER_KG)
    : MIN_OUTSTATION;

  res.status(200).json({ fee, local: false });
}
