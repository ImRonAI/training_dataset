const https = require('https');
const fs = require('fs');

https.get('https://docs.perplexity.ai/openapi.json', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync('openapi.json', data);
    console.log('Saved openapi.json');
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
