import fs from 'node:fs';
import path from 'node:path';

const auth = process.env.ADMIN_BASIC_AUTH;
const isProd = process.env.NETLIFY === 'true' || process.env.NODE_ENV === 'production';

if (!auth) {
  const message = 'ADMIN_BASIC_AUTH não definido para gerar Basic Auth do admin.';
  if (isProd) {
    console.error(message);
    process.exit(1);
  } else {
    console.warn(message);
  }
}

const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.neon.tech";

const securityHeaders = [
  '  X-Frame-Options: DENY',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: no-referrer',
  `  Content-Security-Policy: ${csp}`,
];

const sections = [];

const addSection = (route) => {
  const lines = [route];
  if (auth) {
    lines.push(`  Basic-Auth: ${auth}`);
  }
  lines.push(...securityHeaders);
  sections.push(lines.join('\n'));
};

addSection('/admin/*');
addSection('/api/v1/admin/*');

const output = `${sections.join('\n\n')}\n`;
const headersPath = path.join(process.cwd(), 'public', '_headers');

fs.mkdirSync(path.dirname(headersPath), { recursive: true });
fs.writeFileSync(headersPath, output, 'utf8');

console.log('Arquivo _headers gerado com sucesso.');
