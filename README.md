# Alight Genie

buatkan saya web dengan code ini

/*
Name: Alight Motion Premium Generator (AlightPro)
Type: Scraper/Generator
Noted: Generate premium Alight Motion via API dengan security token - send magic link & verify
Saluran 1: https://whatsapp.com/channel/0029Vb6dJVWBA1eukbJ5kX1r
Saluran 2: https://whatsapp.com/channel/0029VbANq6v0VycMue9vPs3u
Base Url: https://www.alightpro.my.id
Developer: t.me/hazeloffc
*/

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    BASE_URL: 'https://www.alightpro.my.id',
    OUTPUT_DIR: './alight-output',
    TIMEOUT: 60000
};

if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
}

function generatePow(nonce) {
    const target = '0000';
    let pow = '';
    let found = false;
    
    for (let i = 0; i < 1000000; i++) {
        const test = i.toString(16).padStart(8, '0');
        const hash = crypto.createHash('sha256')
            .update(nonce + test)
            .digest('hex');
        
        if (hash.startsWith(target)) {
            pow = test;
            found = true;
            break;
        }
    }
    
    if (!found) {
        // Fallback: use timestamp-based pow
        pow = Date.now().toString(16);
    }
    
    return pow;
}

async function getSession() {
    try {
        const response = await axios.get(`${CONFIG.BASE_URL}/api/session`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: CONFIG.TIMEOUT
        });

        return {
            success: true,
            token: response.data.token,
            nonce: response.data.nonce,
            sessionId: response.data.sessionId,
            timestamp: response.data.timestamp
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

async function alightMotion(email, rawLink = null) {
    try {
        if (!email) {
            const result = { success: false, error: 'Email wajib diisi' };
            console.log(JSON.stringify(result, null, 2));
            return result;
        }

        // Step 1: Get session
        console.log('🔐 Getting session...');
        const session = await getSession();
        if (!session.success) {
            const result = { success: false, error: session.error };
            console.log(JSON.stringify(result, null, 2));
            return result;
        }

        console.log(`✅ Session: ${session.sessionId.slice(0, 16)}...`);

        // Step 2: Generate PoW
        console.log('⚡ Generating PoW...');
        const pow = generatePow(session.nonce);
        console.log(`✅ PoW: ${pow.slice(0, 8)}...`);

        // If rawLink provided, verify directly
        if (rawLink) {
            console.log('\n📧 Verifying link...');
            const verifyResponse = await axios.post(`${CONFIG.BASE_URL}/api/alight-motion`, {
                action: 'verify',
                email: email,
                link: rawLink
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Amprem-Token': session.token,
                    'X-Amprem-Nonce': session.nonce,
                    'X-Amprem-Pow': pow
                },
                timeout: CONFIG.TIMEOUT
            });

            const result = {
                success: true,
                email: email,
                message: 'Account verified successfully',
                premium: true,
                duration: '1 Tahun',
                data: verifyResponse.data.data || null
            };

            const outputPath = path.join(CONFIG.OUTPUT_DIR, `alight_${Date.now()}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

            console.log(JSON.stringify(result, null, 2));
            return result;
        }

        // Step 3: Send magic link
        console.log('\n📧 Sending magic link...');
        const sendResponse = await axios.post(`${CONFIG.BASE_URL}/api/alight-motion`, {
            action: 'send',
            email: email
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Amprem-Token': session.token,
                'X-Amprem-Nonce': session.nonce,
                'X-Amprem-Pow': pow
            },
            timeout: CONFIG.TIMEOUT
        });

        const result = {
            success: true,
            email: email,
            message: sendResponse.data.msg || 'Link berhasil dikirim',
            instructions: [
                'Buka inbox email (cek folder Spam juga)',
                'Cari email dari "Alight Motion" / "Alight Creative"',
                'Tekan-tahan tombol "Login ke Alight Creative", pilih "Salin URL"',
                'Jangan klik langsung — copy link doang',
                'Panggil: alightMotion("email", "link_yang_dicopy")'
            ]
        };

        console.log(JSON.stringify(result, null, 2));
        return result;

    } catch (error) {
        const result = {
            success: false,
            error: error.response?.data || error.message
        };
        console.log(JSON.stringify(result, null, 2));
        return result;
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    let email = '';
    let link = '';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--email' && args[i + 1]) {
            email = args[++i];
        } else if (args[i] === '--link' && args[i + 1]) {
            link = args[++i];
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log(JSON.stringify({
                usage: 'node alight.js --email <email> [--link <raw_link>]',
                example: 'node alight.js --email user@gmail.com',
                example2: 'node alight.js --email user@gmail.com --link "https://..."'
            }, null, 2));
            process.exit(0);
        }
    }

    if (!email) {
        console.log(JSON.stringify({ error: 'Email wajib diisi. Gunakan --email <email>' }, null, 2));
        process.exit(1);
    }

    alightMotion(email, link || null);
}

module.exports = { alightMotion, getSession, generatePow };



buat dengan TanStack start dan backend menggunakan router, dan syle menggunakan tailwind , dan react, support deploy vercell

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/acf7ef4b-0d62-47b0-85b2-e2eb45eb0f05).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
