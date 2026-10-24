import assert from 'assert';
import http from 'http';

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve({ data, status: res.statusCode }); });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('Starting verification...');

  // Wait for server to be ready
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const { status } = await fetchHtml('http://localhost:3000/');
      if (status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!serverReady) {
    throw new Error('Server did not start in time');
  }

  const { data: html, status: htmlStatus } = await fetchHtml('http://localhost:3000/');

  console.log('Verifying HTML metadata...');
  assert.ok(html.includes('<title>Idee8 — Next.js + Notion Waitlist Template</title>'), 'Missing or incorrect <title>');
  assert.ok(html.includes('<meta name="description" content="A simple Next.js waitlist template with Notion as CMS and Resend to send emails created with React Email and Upstash Redis for rate limiting. Deployed on Vercel."/>'), 'Missing or incorrect <meta name="description">');
  assert.ok(html.includes('<link rel="canonical" href="https://waitly.idee8.agency"/>') || html.includes('<link rel="canonical" href="https://waitly.idee8.agency/"/>'), 'Missing or incorrect <link rel="canonical">');

  assert.ok(html.includes('<meta property="og:title" content="Idee8 — Next.js + Notion Waitlist Template"/>'), 'Missing or incorrect Open Graph Title');
  assert.ok(html.includes('<meta property="og:url" content="https://waitly.idee8.agency"/>') || html.includes('<meta property="og:url" content="https://waitly.idee8.agency/"/>'), 'Missing or incorrect Open Graph URL');
  assert.ok(html.includes('<meta property="og:type" content="website"/>'), 'Missing or incorrect Open Graph Type');

  console.log('Verifying JSON-LD...');
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(jsonLdMatch, 'Missing JSON-LD script');

  const parsedJsonLd = JSON.parse(jsonLdMatch[1]);
  assert.strictEqual(parsedJsonLd['@context'], 'https://schema.org');
  assert.ok(Array.isArray(parsedJsonLd['@graph']), 'JSON-LD should contain a graph');
  assert.ok(parsedJsonLd['@graph'].some(item => item['@type'] === 'WebSite'), 'Missing WebSite in JSON-LD');
  assert.ok(parsedJsonLd['@graph'].some(item => item['@type'] === 'Organization'), 'Missing Organization in JSON-LD');
  assert.ok(parsedJsonLd['@graph'].some(item => item['@type'] === 'SoftwareApplication'), 'Missing SoftwareApplication in JSON-LD');

  console.log('Verifying Sitemap...');
  const { data: sitemapData, status: sitemapStatus } = await fetchHtml('http://localhost:3000/sitemap.xml');
  assert.strictEqual(sitemapStatus, 200, 'Sitemap returned non-200 status');
  assert.ok(sitemapData.includes('<url>'), 'Sitemap missing <url> tag');
  assert.ok(sitemapData.includes('<loc>https://waitly.idee8.agency</loc>'), 'Sitemap missing correct loc');
  assert.ok(!sitemapData.includes('<loc>http://localhost:3000</loc>'), 'Sitemap loc should not use localhost');

  console.log('Verifying Robots.txt...');
  const { data: robotsData, status: robotsStatus } = await fetchHtml('http://localhost:3000/robots.txt');
  assert.strictEqual(robotsStatus, 200, 'Robots returned non-200 status');
  assert.ok(robotsData.includes('User-Agent: *'), 'Robots.txt missing User-Agent: *');
  assert.ok(robotsData.includes('Allow: /'), 'Robots.txt missing Allow: /');
  assert.ok(robotsData.includes('Sitemap: https://waitly.idee8.agency/sitemap.xml'), 'Robots.txt missing Sitemap');

  console.log('Verifying llms.txt...');
  const { data: llmsData, status: llmsStatus } = await fetchHtml('http://localhost:3000/llms.txt');
  assert.strictEqual(llmsStatus, 200, 'llms.txt returned non-200 status');
  assert.ok(llmsData.includes('https://waitly.idee8.agency/'), 'llms.txt missing correct link');
  assert.ok(llmsData.includes('Next.js + Notion Waitlist Template'), 'llms.txt missing description');

  console.log('All verifications passed!');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});