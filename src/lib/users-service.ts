import type { PlayerProfile } from '@/types';
import { firestore, auth } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toIsoString } from './utils';

const usersCollection = collection(firestore, 'users');

const processUserDoc = (doc: any): PlayerProfile => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        joined: toIsoString(data.joined),
    } as PlayerProfile;
}

export const getUsersStream = (callback: (users: PlayerProfile[]) => void) => {
  const q = query(usersCollection, orderBy('joined', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(processUserDoc));
  });
  return unsubscribe;
};

export const getTopPlayersStream = (callback: (players: PlayerProfile[]) => void, count: number = 3) => {
  // Query without composite index requirement. Filtering by role and then sorting client-side.
  const q = query(usersCollection, where('role', '==', 'Player'), limit(count * 2)); // Fetch more to sort
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const players = snapshot.docs.map(processUserDoc);
    players.sort((a, b) => b.winrate - a.winrate);
    callback(players.slice(0, count));
  });
  return unsubscribe;
}

export const getPlayersStream = (callback: (players: PlayerProfile[]) => void) => {
  // Query without composite index requirement. Filtering by role and then sorting client-side.
  const q = query(usersCollection, where('role', '==', 'Player'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const players = snapshot.docs.map(processUserDoc);
    players.sort((a, b) => b.winrate - a.winrate);
    callback(players);
  });
  return unsubscribe;
};

export const getUserProfileStream = (userId: string, callback: (profile: PlayerProfile | null) => void) => {
    const userDoc = doc(firestore, 'users', userId);
    const unsubscribe = onSnapshot(userDoc, (doc) => {
        if (doc.exists()) {
            callback(processUserDoc(doc));
        } else {
            callback(null);
        }
    });
    return unsubscribe;
};

export const updateUserProfile = async (userId: string, data: Partial<Pick<PlayerProfile, 'name' | 'gamerId' | 'avatar' | 'banner' | 'gameName'>>) => {
  const userDoc = doc(usersCollection, userId);
  try {
    await updateDoc(userDoc, data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const findUserByGamerId = async (gamerId: string): Promise<PlayerProfile | null> => {
    const q = query(usersCollection, where('gamerId', '==', gamerId), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    return processUserDoc(snapshot.docs[0]);
}

export const updateUserBalance = async (
  userId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> => {
  const userDocRef = doc(usersCollection, userId);
  const transactionsCollectionRef = collection(firestore, 'transactions');
  
  try {
    await runTransaction(firestore, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) throw new Error("User not found.");

      const currentBalance = userDoc.data().balance || 0;
      if (amount < 0 && (currentBalance + amount < 0)) {
        throw new Error("User balance cannot go below zero.");
      }

      const newBalance = currentBalance + amount;
      transaction.update(userDocRef, { balance: newBalance });

      // Create a transaction log
      const newTransactionRef = doc(transactionsCollectionRef);
      transaction.set(newTransactionRef, {
        userId,
        amount,
        type: 'admin_adjustment',
        description: `Admin balance adjustment`,
        date: serverTimestamp(),
      });
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateUserStatus = async (
    userId: string,
    status: 'active' | 'banned'
): Promise<{ success: boolean; error?: string }> => {
    const userDoc = doc(usersCollection, userId);
    try {
        await updateDoc(userDoc, { status });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const sendPasswordResetForUser = async (email: string | null): Promise<{ success: boolean; error?: string }> => {
    // This function now just calls the auth service
    if (!email) {
        return { success: false, error: 'User email is not available.' };
    }
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
};
