const http = require('http');

http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const httpsTunnel = parsed.tunnels.find(t => t.public_url.startsWith('https'));
      if (httpsTunnel) {
        console.log("NGROK_URL=" + httpsTunnel.public_url);
      } else {
        console.log("No HTTPS tunnel found.", parsed.tunnels);
      }
    } catch (e) {
      console.log("Error parsing ngrok response", e.message);
    }
  });
}).on('error', (err) => {
  console.log("Error connecting to ngrok api", err.message);
});
