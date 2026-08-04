const { put, list } = require('@vercel/blob');

const PATHNAME = 'financeos-data.json';

module.exports = async (req, res) => {
  const token = req.headers['x-financeos-token'];
  if (!process.env.FINANCEOS_SYNC_TOKEN || token !== process.env.FINANCEOS_SYNC_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: PATHNAME, limit: 1 });
      const blob = blobs.find(b => b.pathname === PATHNAME);
      if (!blob) {
        res.status(200).json(null);
        return;
      }
      // cache-bust: cada escrita muda uploadedAt, então a query força ignorar
      // qualquer cópia em cache de CDN de uma versão anterior do arquivo.
      const bust = new Date(blob.uploadedAt).getTime();
      const r = await fetch(`${blob.url}?v=${bust}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`blob fetch ${r.status}`);
      const data = await r.json();
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ error: String(e && e.message || e) });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (!body || typeof body === 'string') {
        body = JSON.parse(body || '{}');
      }
      await put(PATHNAME, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 0
      });
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message || e) });
    }
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};
