import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAuthLink,cleanAuthLink} from '../src/auth-links.ts';
test('expired and rejected links provide safe recovery instructions without reflecting untrusted descriptions',()=>{
 assert.match(inspectAuthLink('https://example.com/account/#error_code=otp_expired&error_description=SECRET').message,/expired/);
 const unknown=inspectAuthLink('https://example.com/account/?error_description=SECRET');
 assert.equal(unknown.kind,'error');assert.ok(!unknown.message.includes('SECRET'));
});
test('URL cleanup removes credential and error parameters while preserving unrelated navigation',()=>{
 assert.equal(cleanAuthLink('https://example.com/account/?campaign=welcome&code=SECRET#access_token=SECRET&refresh_token=SECRET&type=recovery'),'/account/?campaign=welcome');
 assert.equal(cleanAuthLink('https://example.com/admin/#account-setup'),'/admin/#account-setup');
 assert.equal(cleanAuthLink('https://example.com/account/?error_code=otp_expired&campaign=welcome'),'/account/?campaign=welcome');
});
test('a recovery URL expresses intent only and supplies no authentication authority',()=>{
 assert.deepEqual(inspectAuthLink('https://example.com/account/#type=recovery'),{kind:'recovery',hasAuthParams:true,message:''});
 assert.equal(inspectAuthLink('https://example.com/account/').kind,'none');
 assert.equal(inspectAuthLink('https://example.com/admin/#type=signup').kind,'confirmation');
});
