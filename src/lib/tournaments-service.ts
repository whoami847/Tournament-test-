import { firestore } from './firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  runTransaction,
  writeBatch,
  arrayUnion,
  increment,
  setDoc,
} from 'firebase/firestore';
import type { Tournament, Team, Match, Round, TeamType, PlayerProfile } from '@/types';
import { toIsoString, toTimestamp } from './utils';

const tournamentsCollection = collection(firestore, 'tournaments');

const getTeamType = (format: string = ''): TeamType => {
  const type = format.split('_')[1]?.toUpperCase() || 'SQUAD';
  return (['SOLO', 'DUO', 'SQUAD'] as TeamType[]).includes(type) ? type : 'SQUAD';
};

const generateBracketStructure = (maxTeams: number, tournamentId: string): Round[] => {
    let bracketSize = 2;
    while (bracketSize < maxTeams) bracketSize *= 2;
    const roundNamesMap: Record<number, string> = { 2: 'Finals', 4: 'Semi-finals', 8: 'Quarter-finals', 16: 'Round of 16', 32: 'Round of 32', 64: 'Round of 64' };
    const rounds: Round[] = [];
    let currentTeams = bracketSize;
    while (currentTeams >= 2) {
        const roundName = roundNamesMap[currentTeams] || `Round of ${currentTeams}`;
        const numMatches = currentTeams / 2;
        const matches: Match[] = Array.from({ length: numMatches }, (_, i) => ({
            id: `${tournamentId}_${roundName.replace(/\s+/g, '-')}_m${i + 1}`,
            name: `${roundName} #${i + 1}`,
            teams: [null, null], scores: [0, 0], status: 'pending', resultSubmissionStatus: {}, roomId: '', roomPass: '',
        }));
        rounds.push({ name: roundName, matches });
        currentTeams /= 2;
    }
    return rounds;
};

export const addTournament = async (data: Omit<Tournament, 'id' | 'createdAt' | 'teamsCount' | 'status' | 'participants' | 'bracket'>) => {
    const newTournamentRef = doc(tournamentsCollection);
    try {
        const newTournament: Omit<Tournament, 'id'> = {
            ...data,
            startDate: toTimestamp(data.startDate),
            createdAt: serverTimestamp() as any,
            teamsCount: 0,
            status: 'upcoming',
            participants: [],
            bracket: generateBracketStructure(data.maxTeams, newTournamentRef.id),
        };
        await setDoc(newTournamentRef, newTournament);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

const processTournamentDoc = (doc: any): Tournament => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        startDate: toIsoString(data.startDate),
        createdAt: toIsoString(data.createdAt),
    } as Tournament;
}

export const getTournamentsStream = (callback: (tournaments: Tournament[]) => void) => {
    const q = query(tournamentsCollection, orderBy('startDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(processTournamentDoc));
    });
};

export const getTournamentStream = (id: string, callback: (tournament: Tournament | null) => void) => {
    const tournamentDoc = doc(firestore, 'tournaments', id);
    return onSnapshot(tournamentDoc, (doc) => {
        if (doc.exists()) {
            callback(processTournamentDoc(doc));
        } else {
            callback(null);
        }
    });
};

export const getTournaments = async (): Promise<Tournament[]> => {
    const q = query(tournamentsCollection, orderBy('startDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(processTournamentDoc);
};

export const getTournament = async (id: string): Promise<Tournament | null> => {
    const docRef = doc(firestore, 'tournaments', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? processTournamentDoc(docSnap) : null;
};

export const updateTournament = async (id: string, data: Partial<Tournament>) => {
    const tournamentDoc = doc(firestore, 'tournaments', id);
    try {
        if (data.startDate && typeof data.startDate === 'string') {
            data.startDate = toTimestamp(data.startDate) as any;
        }
        await updateDoc(tournamentDoc, data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteTournament = async (id: string) => {
    const tournamentDoc = doc(firestore, 'tournaments', id);
    try {
        await deleteDoc(tournamentDoc);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const joinTournament = async (tournamentId: string, newParticipant: Team, userId: string) => {
    const tournamentDocRef = doc(firestore, 'tournaments', tournamentId);
    const userDocRef = doc(firestore, 'users', userId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const tournamentDoc = await transaction.get(tournamentDocRef);
            if (!tournamentDoc.exists()) throw new Error('Tournament not found.');
            const tournament = tournamentDoc.data() as Tournament;

            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error('User profile not found.');
            const user = userDoc.data() as PlayerProfile;

            if (tournament.teamsCount >= tournament.maxTeams) throw new Error('Tournament is full.');
            
            const allJoinedGamerIds = new Set(tournament.participants.flatMap(p => p.members?.map(m => m.gamerId) || []));
            const newTeamGamerIds = newParticipant.members?.map(m => m.gamerId) || [];
            const alreadyJoinedMemberId = newTeamGamerIds.find(id => allJoinedGamerIds.has(id));
            if (alreadyJoinedMemberId) throw new Error(`Player ${alreadyJoinedMemberId} is already registered.`);
            
            if (tournament.entryFee > 0) {
                if (user.balance < tournament.entryFee) throw new Error('Insufficient balance.');
                transaction.update(userDocRef, { balance: user.balance - tournament.entryFee });
            }
            
            const updatedParticipants = [...tournament.participants, newParticipant];
            
            let teamPlaced = false;
            for (const match of tournament.bracket[0]?.matches || []) {
                const emptySlotIndex = match.teams.indexOf(null);
                if (emptySlotIndex !== -1) {
                    match.teams[emptySlotIndex] = newParticipant;
                    teamPlaced = true;
                    break;
                }
            }
            
            if (!teamPlaced) throw new Error("Could not find a slot in the bracket.");
            
            transaction.update(tournamentDocRef, { 
                participants: updatedParticipants,
                teamsCount: increment(1),
                bracket: tournament.bracket,
            });
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const requestMatchResults = async (tournamentId: string, roundName: string, matchId: string) => {
    const tournamentDocRef = doc(tournamentsCollection, tournamentId);
    try {
        await runTransaction(firestore, async (transaction) => {
            const tournamentDoc = await transaction.get(tournamentDocRef);
            if (!tournamentDoc.exists()) throw new Error("Tournament not found");
            const bracket = tournamentDoc.data().bracket;
            const round = bracket.find((r: any) => r.name === roundName);
            const match = round?.matches.find((m: any) => m.id === matchId);

            if (!match || !match.teams[0] || !match.teams[1]) throw new Error("Both teams must be present.");

            match.resultSubmissionStatus = {
                [match.teams[0].id]: 'pending',
                [match.teams[1].id]: 'pending',
            };
            transaction.update(tournamentDocRef, { bracket });
        });

        // Notifications would be sent from here in a real app
        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}

export const setMatchWinner = async (tournamentId: string, roundName: string, matchId: string, winnerTeamId: string) => {
    const tournamentDocRef = doc(tournamentsCollection, tournamentId);
    try {
        await runTransaction(firestore, async (transaction) => {
            const tournamentDoc = await transaction.get(tournamentDocRef);
            if (!tournamentDoc.exists()) throw new Error("Tournament not found.");
            
            const bracket = tournamentDoc.data().bracket;
            const roundIndex = bracket.findIndex((r: any) => r.name === roundName);
            const matchIndex = bracket[roundIndex].matches.findIndex((m: any) => m.id === matchId);
            const match = bracket[roundIndex].matches[matchIndex];
            
            if (!match.teams[0] || !match.teams[1]) throw new Error("Both teams must be present.");

            const winnerIndex = match.teams.findIndex((t: any) => t?.id === winnerTeamId);
            if (winnerIndex === -1) throw new Error("Winner not found in match.");

            match.status = 'completed';
            match.scores = winnerIndex === 0 ? [1, 0] : [0, 1];

            // Advance winner
            if (roundIndex < bracket.length - 1) {
                const nextRound = bracket[roundIndex + 1];
                const nextMatchIndex = Math.floor(matchIndex / 2);
                const slotInNextMatch = matchIndex % 2;
                if (nextRound?.matches[nextMatchIndex]) {
                    nextRound.matches[nextMatchIndex].teams[slotInNextMatch] = match.teams[winnerIndex];
                }
            }
            transaction.update(tournamentDocRef, { bracket });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const undoMatchResult = async (tournamentId: string, roundName: string, matchId: string) => {
    const tournamentDocRef = doc(tournamentsCollection, tournamentId);
    try {
        await runTransaction(firestore, async (transaction) => {
            const tournamentDoc = await transaction.get(tournamentDocRef);
            if (!tournamentDoc.exists()) throw new Error("Tournament not found.");
            
            const bracket = tournamentDoc.data().bracket;
            const roundIndex = bracket.findIndex((r: any) => r.name === roundName);
            const matchIndex = bracket[roundIndex].matches.findIndex((m: any) => m.id === matchId);
            const match = bracket[roundIndex].matches[matchIndex];

            const oldWinner = match.scores[0] > match.scores[1] ? match.teams[0] : match.teams[1];
            
            match.status = 'pending';
            match.scores = [0, 0];

            if (oldWinner && roundIndex < bracket.length - 1) {
                const nextRound = bracket[roundIndex + 1];
                const nextMatchIndex = Math.floor(matchIndex / 2);
                const slotInNextMatch = matchIndex % 2;
                if (nextRound?.matches[nextMatchIndex]?.teams[slotInNextMatch]?.id === oldWinner.id) {
                    nextRound.matches[nextMatchIndex].teams[slotInNextMatch] = null;
                }
            }
            transaction.update(tournamentDocRef, { bracket });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateMatchDetails = async (tournamentId: string, matchId: string, details: { roomId: string; roomPass: string }) => {
    const tournamentDocRef = doc(tournamentsCollection, tournamentId);
    try {
        await runTransaction(firestore, async (transaction) => {
            const tournamentDoc = await transaction.get(tournamentDocRef);
            if (!tournamentDoc.exists()) throw new Error("Tournament not found.");
            const bracket = tournamentDoc.data().bracket;
            let matchFound = false;
            for (const round of bracket) {
                const match = round.matches.find((m: any) => m.id === matchId);
                if (match) {
                    match.roomId = details.roomId;
                    match.roomPass = details.roomPass;
                    matchFound = true;
                    break;
                }
            }
            if (!matchFound) throw new Error("Match not found.");
            transaction.update(tournamentDocRef, { bracket });
        });
        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
};
