import test from 'node:test';
import assert from 'node:assert/strict';
import {assessResearch} from '../research-privacy.js';
test('consent is required for public search',()=>{
 assert.equal(assessResearch({consent:false,query:'histoire de Paris'}).allowed,false);
 assert.equal(assessResearch({consent:true,query:'histoire de Paris'}).allowed,true);
});
