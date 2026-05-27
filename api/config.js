export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`
    window.SUPABASE_URL = "${process.env.SUPABASE_URL}";
    window.SUPABASE_ANON_KEY = "${process.env.SUPABASE_ANON_KEY}";
  `);
}
