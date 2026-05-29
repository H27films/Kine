export default async function handler(req: any, res: any) {
    const { code } = req.query;
  
    if (!code) {
      res.status(400).json({ error: 'No code provided' });
      return;
    }
  
    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: '250203',
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      });
  
      const data = await response.json();
      
      if (data.access_token) {
        // Redirect back to app with token info in URL fragment
        res.redirect(`https://kine-v2.vercel.app/?strava_token=${data.access_token}&strava_refresh=${data.refresh_token}&strava_expires=${data.expires_at}`);
      } else {
        res.redirect('https://kine-v2.vercel.app/?strava_error=auth_failed');
      }
    } catch (e) {
      res.redirect('https://kine-v2.vercel.app/?strava_error=server_error');
    }
  }