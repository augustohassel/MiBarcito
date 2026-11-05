import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  getFirebaseServices,
  isFirebaseConfigured,
  traducirErrorFirebase,
} from '../infrastructure/firebase/firebase-client';

export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthContextType {
  user: AuthUserProfile | null;
  loadingAuth: boolean;
  firebaseEnabled: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  reportCloudError: (err: unknown) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapFirebaseUser(user: User | null): AuthUserProfile | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUserProfile | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, initialUser = null }) => {
  const services = useMemo(() => getFirebaseServices(), []);
  const firebaseEnabled = Boolean(services);

  const [user, setUser] = useState<AuthUserProfile | null>(initialUser);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(firebaseEnabled && !initialUser);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!services) {
      setLoadingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      services.auth,
      (firebaseUser) => {
        setUser(mapFirebaseUser(firebaseUser));
        setLoadingAuth(false);
      },
      (err) => {
        setAuthError(traducirErrorFirebase(err));
        setLoadingAuth(false);
      }
    );

    return () => unsubscribe();
  }, [services]);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    if (!services) {
      setAuthError(
        'La sincronización en la nube aún no está configurada en este entorno (faltan variables VITE_FIREBASE_*).'
      );
      return false;
    }

    try {
      setAuthError(null);
      const cred = await signInWithPopup(services.auth, services.googleProvider);
      setUser(mapFirebaseUser(cred.user));
      return true;
    } catch (err) {
      setAuthError(traducirErrorFirebase(err));
      return false;
    }
  }, [services]);

  const signOut = useCallback(async (): Promise<void> => {
    if (!services) {
      setUser(null);
      return;
    }

    try {
      setAuthError(null);
      await firebaseSignOut(services.auth);
      setUser(null);
    } catch (err) {
      setAuthError(traducirErrorFirebase(err));
    }
  }, [services]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const reportCloudError = useCallback((err: unknown) => {
    setAuthError(traducirErrorFirebase(err));
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loadingAuth,
      firebaseEnabled,
      authError,
      signInWithGoogle,
      signOut,
      clearAuthError,
      reportCloudError,
    }),
    [
      user,
      loadingAuth,
      firebaseEnabled,
      authError,
      signInWithGoogle,
      signOut,
      clearAuthError,
      reportCloudError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      loadingAuth: false,
      firebaseEnabled: isFirebaseConfigured(),
      authError: null,
      signInWithGoogle: async () => false,
      signOut: async () => {},
      clearAuthError: () => {},
      reportCloudError: () => {},
    };
  }
  return ctx;
}

