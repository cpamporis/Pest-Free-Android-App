const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { ensure } = require('../scripts/prepareWhisperAndroid.cjs');
test('Whisper build cache is verified and invalid downloads fail closed', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pestify-artifacts-'));
  const file = path.join(dir, 'model.bin');
  const valid = Buffer.from('verified model fixture');
  const hash = crypto.createHash('sha256').update(valid).digest('hex');
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; return { ok: true, url: 'https://example.com/model', body: new ReadableStream({ start(c) { c.enqueue(Buffer.from('corrupt')); c.close(); } }) }; };
  try {
    await fs.writeFile(file, valid);
    await ensure('https://example.com/model', file, hash, 100, valid.length);
    assert.equal(calls, 0);
    await fs.writeFile(file, 'corrupt cache');
    await assert.rejects(ensure('https://example.com/model', file, hash, 100, valid.length), /checksum mismatch/);
    assert.equal(calls, 1);
    await assert.rejects(fs.stat(file + '.part'), { code: 'ENOENT' });
    await assert.rejects(ensure('https://example.com/model', file, hash, 2), /size limit/);
    await assert.rejects(fs.stat(file + '.part'), { code: 'ENOENT' });
  } finally { global.fetch = original; await fs.rm(dir, { recursive: true, force: true }); }
});
