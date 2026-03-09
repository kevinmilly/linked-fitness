import { Page } from '@playwright/test';

/**
 * Mock Firebase Auth and Firestore API calls so e2e tests can run
 * without a real Firebase backend.
 *
 * Strategy: Intercept the Firebase Auth REST API and Firestore REST API
 * requests, plus inject a script that stubs the Firebase JS SDK's
 * onAuthStateChanged to emit a fake user.
 */

export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
}

export const TEST_USER: MockUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

/**
 * Set up route interceptions to mock Firebase for unauthenticated state.
 * The app will behave as if no user is signed in, so the auth guard
 * redirects to /auth.
 */
export async function mockFirebaseUnauthenticated(page: Page): Promise<void> {
  // Block all Firebase API calls
  await blockFirebaseRequests(page);

  // Inject script before page loads to stub Firebase Auth as unauthenticated
  await page.addInitScript(() => {
    (window as any).__PLAYWRIGHT_AUTH_STATE__ = null;
  });
}

/**
 * Set up route interceptions to mock Firebase for authenticated state.
 * The app will behave as if a user is signed in, allowing access to
 * guarded routes.
 */
export async function mockFirebaseAuthenticated(
  page: Page,
  user: MockUser = TEST_USER,
): Promise<void> {
  // Block all Firebase API calls
  await blockFirebaseRequests(page);

  // Inject script before page loads to stub Firebase Auth as authenticated
  await page.addInitScript((mockUser) => {
    (window as any).__PLAYWRIGHT_AUTH_STATE__ = {
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName,
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: 'fake-refresh-token',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => 'fake-id-token',
      getIdTokenResult: async () => ({
        token: 'fake-id-token',
        claims: {},
        authTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
        issuedAtTime: new Date().toISOString(),
        signInProvider: 'password',
        signInSecondFactor: null,
      }),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null,
      providerId: 'firebase',
    };
  }, user);
}

/**
 * Block Firebase REST API requests to prevent real network calls.
 * Respond with reasonable defaults.
 */
async function blockFirebaseRequests(page: Page): Promise<void> {
  // Block Firebase Auth REST API (identitytoolkit)
  await page.route('**/identitytoolkit.googleapis.com/**', (route) => {
    const url = route.request().url();

    // Sign in / sign up endpoints
    if (url.includes('signInWithPassword') || url.includes('signUp')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          idToken: 'fake-id-token',
          email: TEST_USER.email,
          refreshToken: 'fake-refresh-token',
          expiresIn: '3600',
          localId: TEST_USER.uid,
          registered: true,
        }),
      });
    }

    // Token refresh
    if (url.includes('token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-access-token',
          expires_in: '3600',
          token_type: 'Bearer',
          refresh_token: 'fake-refresh-token',
          id_token: 'fake-id-token',
          user_id: TEST_USER.uid,
          project_id: 'fake-project',
        }),
      });
    }

    // Account lookup
    if (url.includes('lookup') || url.includes('getAccountInfo')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            {
              localId: TEST_USER.uid,
              email: TEST_USER.email,
              displayName: TEST_USER.displayName,
              emailVerified: true,
            },
          ],
        }),
      });
    }

    // Default: return empty success
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Block Firestore REST API
  await page.route('**/firestore.googleapis.com/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ documents: [] }),
    });
  });

  // Block Firebase Realtime Database
  await page.route('**/*.firebaseio.com/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    });
  });

  // Block Firebase Analytics / App Check
  await page.route('**/firebase.googleapis.com/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Block Google APIs (OAuth, etc.)
  await page.route('**/googleapis.com/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Block Firebase config fetch
  await page.route('**/firebaseinstallations.googleapis.com/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'projects/fake/installations/fake',
        fid: 'fake-fid',
        refreshToken: 'fake-refresh',
        authToken: { token: 'fake-auth-token', expiresIn: '604800s' },
      }),
    });
  });
}

/**
 * Navigate to a route that requires auth by first setting up mock auth state.
 * This uses a two-step approach:
 * 1. Set up route interceptions for Firebase APIs
 * 2. Use page.addInitScript to override the auth state before Angular boots
 *
 * Note: Because Angular Fire uses the Firebase JS SDK which initializes via
 * WebSocket/long-polling to Firestore, we also need to handle those.
 */
export async function navigateAuthenticated(
  page: Page,
  path: string,
  user: MockUser = TEST_USER,
): Promise<void> {
  await mockFirebaseAuthenticated(page, user);

  // Also intercept the Firestore channel (WebChannel / long polling)
  await page.route('**/google.firestore.v1.Firestore/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto(path, { waitUntil: 'domcontentloaded' });
}
