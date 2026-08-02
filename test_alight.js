import crypto from 'crypto';

async function test() {
  const BASE_URL = 'https://www.alightpro.my.id';
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  
  console.log("Step 1: Get Session");
  const resSession = await fetch(BASE_URL + '/api/session', {
    headers: {
      'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': BASE_URL + '/',
      'Origin': BASE_URL
    }
  });
  
  const cookies = resSession.headers.get('set-cookie');
  const session = await resSession.json();
  console.log("Session:", JSON.stringify(session));
  console.log("Cookies:", cookies);

  if (!session.status) {
    console.error("Failed to get session");
    return;
  }

  const email = 'test' + Math.random().toString(36).substring(7) + '@gmail.com';
  const action = 'send';
  const difficulty = session.difficulty || '0000';
  const prefix = `${session.sessionId}:${session.nonce}:${email.toLowerCase()}:${action}:`;
  
  console.log("Step 2: Computing POW");
  let pow = '';
  for (let i = 0; i < 500000; i++) {
    const hash = crypto.createHash('sha256').update(prefix + i).digest('hex');
    if (hash.startsWith(difficulty)) {
      pow = String(i);
      break;
    }
  }
  console.log("POW:", pow);

  console.log("Step 3: Send POST");
  const resPost = await fetch(BASE_URL + '/api/alight-motion', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Amprem-Token': session.token,
      'X-Amprem-Nonce': session.nonce,
      'X-Amprem-Pow': pow,
      'Cookie': cookies,
      'Referer': BASE_URL + '/',
      'Origin': BASE_URL
    },
    body: JSON.stringify({ action, email })
  });

  const result = await resPost.json();
  console.log("Result:", JSON.stringify(result));
}

test();
