import test from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage} from '../src/auth-errors.ts';
import {catalogueImage,catalogueText} from '../src/catalogue-display.ts';
test('auth failures distinguish sender configuration and rate limits without leaking backend details',()=>{
 assert.match(authErrorMessage({code:'email_address_not_authorized'},'signup'),/sender configuration/);
 assert.match(authErrorMessage({status:429},'reset'),/wait/);
 assert.match(authErrorMessage({code:'email_not_confirmed'},'login'),/Verify your email/);
 assert.equal(authErrorMessage({code:'private-error'},'login'),'Sign-in failed. Check your email and password.');
});
test('catalogue presentation suppresses generated images and unsafe image schemes',()=>{
 assert.equal(catalogueImage('https://media.base44.com/images/generated_image.png'),'');
 assert.equal(catalogueImage('javascript:alert(1)'),'');
 assert.equal(catalogueImage('https://name:password@example.com/photo.jpg'),'');
 assert.equal(catalogueImage('https://example.com/photo.jpg'),'https://example.com/photo.jpg');
 assert.equal(catalogueText('Laptop 14\\"'),'Laptop 14"');
});
