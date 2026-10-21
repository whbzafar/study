/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIp, validateUrlForSsrf } from './ssrfValidator';

test('isPrivateIp correctly identifies IPv4 private and reserved addresses', () => {
  // Loopback
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('127.1.2.3'), true);

  // RFC 1918 Private Ranges
  assert.equal(isPrivateIp('10.0.0.1'), true);
  assert.equal(isPrivateIp('10.254.100.2'), true);
  assert.equal(isPrivateIp('172.16.0.1'), true);
  assert.equal(isPrivateIp('172.24.5.6'), true);
  assert.equal(isPrivateIp('172.31.255.255'), true);
  assert.equal(isPrivateIp('192.168.1.1'), true);
  assert.equal(isPrivateIp('192.168.0.254'), true);

  // Link Local & Cloud Metadata (169.254.169.254)
  assert.equal(isPrivateIp('169.254.169.254'), true);
  assert.equal(isPrivateIp('169.254.1.1'), true);

  // Current network
  assert.equal(isPrivateIp('0.0.0.0'), true);

  // Public IP addresses should return false
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('1.1.1.1'), false);
  assert.equal(isPrivateIp('142.250.190.46'), false);
  assert.equal(isPrivateIp('151.101.1.140'), false);
});

test('isPrivateIp correctly identifies IPv6 private and reserved addresses', () => {
  assert.equal(isPrivateIp('::1'), true);
  assert.equal(isPrivateIp('::'), true);
  assert.equal(isPrivateIp('fe80::1'), true);
  assert.equal(isPrivateIp('fc00::1'), true);
  assert.equal(isPrivateIp('fd12:3456:789a::1'), true);
  assert.equal(isPrivateIp('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateIp('::ffff:192.168.1.1'), true);
  assert.equal(isPrivateIp('::ffff:169.254.169.254'), true);

  // Public IPv6
  assert.equal(isPrivateIp('2001:4860:4860::8888'), false);
  assert.equal(isPrivateIp('2606:4700:4700::1111'), false);
});

test('validateUrlForSsrf blocks disallowed protocols and localhost hostnames', async () => {
  // Non-HTTP/HTTPS
  const fileRes = await validateUrlForSsrf('file:///etc/passwd');
  assert.equal(fileRes.isValid, false);
  assert.match(fileRes.errorMessage || '', /Unsupported protocol/);

  const ftpRes = await validateUrlForSsrf('ftp://example.com/test.pdf');
  assert.equal(ftpRes.isValid, false);

  // Blocked hostnames
  const localRes = await validateUrlForSsrf('http://localhost:3000/api');
  assert.equal(localRes.isValid, false);
  assert.match(localRes.errorMessage || '', /forbidden/i);

  const metaRes = await validateUrlForSsrf('http://169.254.169.254/latest/meta-data/');
  assert.equal(metaRes.isValid, false);

  const gcpMetaRes = await validateUrlForSsrf('http://metadata.google.internal/computeMetadata/v1/');
  assert.equal(gcpMetaRes.isValid, false);
});
