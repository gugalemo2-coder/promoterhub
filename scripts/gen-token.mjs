import { SignJWT } from 'jose';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env manually
try {
  const envContent = readFileSync(join(__dirname, '../.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
} catch (e) {
  console.log('No .env file found');
}

const secret = process.env.JWT_SECRET || '';
const appId = process.env.APP_ID || 'promoterhub';

console.log('JWT_SECRET length:', secret.length);
console.log('APP_ID:', appId);

if (!secret) {
  console.error('JWT_SECRET not found in environment');
  process.exit(1);
}

const encoder = new TextEncoder();
const secretKey = encoder.encode(secret);

const token = await new SignJWT({ 
  openId: 'app_user_1',
  appId: appId,
  name: 'Gustavo Lemes'
})
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setExpirationTime(Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000))
  .sign(secretKey);

console.log('Token:', token);

// Verify it works
const response = await fetch('http://localhost:3000/api/auth/app-me', {
  headers: { 'Authorization': 'Bearer ' + token }
});
const data = await response.json();
console.log('Verification:', JSON.stringify(data).substring(0, 300));
