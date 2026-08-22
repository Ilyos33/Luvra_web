const http = require('http');
const boundary = '----test-boundary';
const body = `--${boundary}\r\nContent-Disposition: form-data; name="name_ru"\r\n\r\nТестовый товар\r\n--${boundary}\r\nContent-Disposition: form-data; name="name_uz"\r\n\r\nTest product\r\n--${boundary}\r\nContent-Disposition: form-data; name="description_ru"\r\n\r\n\r\n--${boundary}\r\nContent-Disposition: form-data; name="description_uz"\r\n\r\n\r\n--${boundary}\r\nContent-Disposition: form-data; name="category_id"\r\n\r\n\r\n--${boundary}\r\nContent-Disposition: form-data; name="is_active"\r\n\r\ntrue\r\n--${boundary}--\r\n`;

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/products',
  method: 'POST',
  headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
}, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('status=' + res.statusCode);
    console.log(data);
  });
});

req.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

req.write(body);
req.end();
