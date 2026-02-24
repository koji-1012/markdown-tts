// api/tts.js - Google Cloud Text-to-Speech バックエンド
// Vercel で動作するサーバーレスAPI

const https = require('https');

// Google Cloud Text-to-Speech API呼び出し関数
async function synthesizeSpeech(text, voice, speed) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.GOOGLE_API_KEY; // 環境変数から取得（安全）

        if (!apiKey) {
            reject(new Error('API キーが設定されていません'));
            return;
        }

        const postData = JSON.stringify({
            input: { text: text },
            voice: {
                languageCode: 'ja-JP',
                name: voice
            },
            audioConfig: {
                audioEncoding: 'MP3',
                pitch: 0,
                speakingRate: speed
            }
        });

        const options = {
            hostname: 'texttospeech.googleapis.com',
            port: 443,
            path: `/v1/text:synthesize?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`API Error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

// Vercel ハンドラー
module.exports = async (req, res) => {
    // CORS対応
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { text, voice, speed } = req.body;

        if (!text || !voice || speed === undefined) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // テキスト長チェック（Google Cloudの制限）
        if (text.length > 5000) {
            res.status(400).json({ error: 'テキストは5000文字以下にしてください' });
            return;
        }

        const result = await synthesizeSpeech(text, voice, speed);
        res.status(200).json(result);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
};
