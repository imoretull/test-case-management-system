import { test, expect } from '@playwright/test';

// Demo API tests using Playwright's request fixture. These hit example.com's
// HTTP endpoint without launching a browser — they're fast and good for
// proving the API project boundary in the runner.

test.describe('Orders API', () => {
  test('GET / returns 200', async ({ request }) => {
    const res = await request.get('https://example.com/');
    expect(res.status()).toBe(200);
  });

  test('response is HTML', async ({ request }) => {
    const res = await request.get('https://example.com/');
    expect(res.headers()['content-type']).toContain('text/html');
  });

  test('response body contains expected marker', async ({ request }) => {
    const res = await request.get('https://example.com/');
    const body = await res.text();
    expect(body).toContain('Example Domain');
  });
});
