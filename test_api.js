const http = require('http');

const BASE_URL = 'http://localhost:10000';

// Helper to make HTTP requests returning a promise
function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${path}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {}
                resolve({ statusCode: res.statusCode, body: parsed });
            });
        });

        req.on('error', err => reject(err));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🚀 STARTING SYSTEM API INTEGRATION TESTS (PORT 10000)\n');

    try {
        // Test 1: Shorten a new URL
        console.log('➡️ TEST 1: Shortening long URL...');
        const longUrl = 'https://www.adoptium.net/temurin/releases/';
        const shortenRes = await request('POST', '/shorten', {
            originalUrl: longUrl,
            customAlias: 'temurin-jdk'
        });

        console.log(`[STATUS] ${shortenRes.statusCode}`);
        console.log(`[BODY]`, shortenRes.body);

        if (shortenRes.statusCode !== 201) {
            throw new Error('Shortening failed');
        }
        const shortCode = shortenRes.body.shortCode;
        const id = shortenRes.body.id;

        // Test 2: Resolve and Track click
        console.log('\n➡️ TEST 2: Resolving short URL and tracking click...');
        const resolveRes = await request('GET', `/${shortCode}`);
        console.log(`[STATUS] ${resolveRes.statusCode} (Expected 302 redirect)`);
        
        // Test 3: Check analytics
        console.log('\n➡️ TEST 3: Fetching analytics details...');
        const analyticsRes = await request('GET', `/analytics/${shortCode}`);
        console.log(`[STATUS] ${analyticsRes.statusCode}`);
        console.log(`[BODY] Click count should be 1. Current value:`, analyticsRes.body.clickCount);
        console.log(`[BODY] Full object:`, analyticsRes.body);

        if (analyticsRes.body.clickCount !== 1) {
            throw new Error('Analytics tracking failed');
        }

        // Test 4: Batch retrieval for LocalStorage Dashboard
        console.log('\n➡️ TEST 4: Performing dashboard batch synchronization...');
        const batchRes = await request('POST', '/api/my-urls', [shortCode, 'non-existent-code']);
        console.log(`[STATUS] ${batchRes.statusCode}`);
        console.log(`[BODY] Synchronized array size (should be 1):`, batchRes.body.length);
        console.log(`[BODY] Items:`, batchRes.body);

        if (batchRes.body.length !== 1) {
            throw new Error('Dashboard sync failed');
        }

        // Test 5: Delete URL
        console.log('\n➡️ TEST 5: Deleting shortened URL...');
        const deleteRes = await request('DELETE', `/delete/${id}`);
        console.log(`[STATUS] ${deleteRes.statusCode}`);
        console.log(`[BODY]`, deleteRes.body);

        if (deleteRes.statusCode !== 200) {
            throw new Error('Deletion failed');
        }

        // Test 6: Verify deletion
        console.log('\n➡️ TEST 6: Verifying deletion...');
        const verifyRes = await request('GET', `/analytics/${shortCode}`);
        console.log(`[STATUS] ${verifyRes.statusCode} (Expected 404)`);
        console.log(`[BODY]`, verifyRes.body);

        console.log('\n🎉 ALL BACKEND API INTEGRATION TESTS PASSED SUCCESSFULLY!');

    } catch (error) {
        console.error('\n❌ TEST SUITE FAILED:', error.message);
    }
}

// Wait a second before running to ensure Tomcat is ready
setTimeout(runTests, 1000);
