import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase (safeguarded against duplicate init)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Ensure consent prompt to guarantee refresh if needed
provider.setCustomParameters({
  prompt: 'consent',
});

// Cache the access token in memory, sessionStorage, and localStorage
let cachedAccessToken: string | null = null;
try {
  cachedAccessToken = sessionStorage.getItem('kisanmitra_oauth_token') || localStorage.getItem('kisanmitra_oauth_token');
} catch (e) {
  // ignore
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Check redirect result first (in case returning from signInWithRedirect)
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          try {
            sessionStorage.setItem('kisanmitra_oauth_token', credential.accessToken);
            localStorage.setItem('kisanmitra_oauth_token', credential.accessToken);
          } catch (e) {}
        }
        if (onAuthSuccess) {
          onAuthSuccess(result.user, cachedAccessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect sign-in result check:', err);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          cachedAccessToken = sessionStorage.getItem('kisanmitra_oauth_token') || localStorage.getItem('kisanmitra_oauth_token');
        } catch (e) {}
      }
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('kisanmitra_oauth_token');
        localStorage.removeItem('kisanmitra_oauth_token');
      } catch (e) {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || '';
    cachedAccessToken = token;
    try {
      if (token) {
        sessionStorage.setItem('kisanmitra_oauth_token', token);
        localStorage.setItem('kisanmitra_oauth_token', token);
      }
    } catch (e) {}
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  }
};

export const googleSignInRedirect = async (): Promise<void> => {
  try {
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error('Google Sign In redirect error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = sessionStorage.getItem('kisanmitra_oauth_token') || localStorage.getItem('kisanmitra_oauth_token');
    } catch (e) {}
  }
  return cachedAccessToken;
};

export const refreshGoogleToken = async (): Promise<string | null> => {
  const result = await googleSignIn();
  return result?.accessToken || null;
};

export const reconnectGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  return googleSignIn();
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('kisanmitra_oauth_token');
    localStorage.removeItem('kisanmitra_oauth_token');
  } catch (e) {}
};

export { auth };
