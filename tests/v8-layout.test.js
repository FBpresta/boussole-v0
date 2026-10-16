import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('V8 modules exist',()=>{
 assert.ok(fs.existsSync('engine.js'));
 assert.ok(fs.existsSync('governance.js'));
});
