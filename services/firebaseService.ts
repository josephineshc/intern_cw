/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0994654492",
  appId: "1:27814246937:web:5f476cec50375d8ab24888",
  apiKey: "AIzaSyCi--sv4C-ZFajxAl23_H6rq4wJnTetiWg",
  authDomain: "gen-lang-client-0994654492.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-lexitonedysarthr-f510bb09-d704-4bab-907c-9d54ef83f89d",
  storageBucket: "gen-lang-client-0994654492.firebasestorage.app",
  messagingSenderId: "27814246937",
  measurementId: ""
};

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom databaseId if configured
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Verify connection dynamically
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isCalibrated: boolean;
  restingSmileWidth: number;
  restingPuckerRatio: number;
  restingMouthOpen: number;
  points: number;
  streak: number;
  completedExercises: Record<string, number>;
  updatedAt: string;
}

/**
 * Sign in using standard Google Auth Provider Popup
 */
export const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

/**
 * Signs out the authenticated user
 */
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

/**
 * Fetches user profile or initializes a default if it doesn't exist
 */
export const getOrCreateUserProfile = async (user: FirebaseUser): Promise<UserProfileData> => {
  const userRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    return docSnap.data() as UserProfileData;
  } else {
    const defaultProfile: UserProfileData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Guest User',
      photoURL: user.photoURL || '',
      isCalibrated: false,
      restingSmileWidth: 0.38,
      restingPuckerRatio: 0.12,
      restingMouthOpen: 0.06,
      points: 0,
      streak: 1,
      completedExercises: {
        speech_drill: 0
      },
      updatedAt: new Date().toISOString()
    };
    await setDoc(userRef, defaultProfile);
    return defaultProfile;
  }
};

/**
 * Updates an existing user profile record in Firestore
 */
export const saveUserProfile = async (userId: string, data: Partial<UserProfileData>): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    ...data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

/**
 * Logs a speech training session directly to Firestore
 */
export const saveTrainingSession = async (
  userId: string,
  sessionData: {
    exerciseId: string;
    exerciseName: string;
    score: number;
    targetPhrase: string;
    transcript: string;
    metrics: {
      maxSmileWidth: number;
      maxPuckerRatio: number;
      maxMouthOpen: number;
      leftRightAsymmetry: number;
      averageLoudness: number;
      vowelSustainDuration: number;
    };
    feedback: {
      assessment: string;
      phoneticFeedback: string;
      scoreExplanation: string;
      recommendedExercises: string[];
      customDrills: string[];
    };
  }
): Promise<string> => {
  const sessionsColRef = collection(db, 'users', userId, 'sessions');
  const newSessionDoc = doc(sessionsColRef);
  const fullSession = {
    id: newSessionDoc.id,
    ...sessionData,
    timestamp: new Date().toISOString()
  };
  await setDoc(newSessionDoc, fullSession);
  return newSessionDoc.id;
};

/**
 * Queries training history sessions for the authenticated user, descending
 */
export const getUserSessions = async (userId: string): Promise<any[]> => {
  const sessionsColRef = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsColRef, orderBy('timestamp', 'desc'));
  const querySnapshot = await getDocs(q);
  const sessions: any[] = [];
  querySnapshot.forEach((doc) => {
    sessions.push(doc.data());
  });
  return sessions;
};
