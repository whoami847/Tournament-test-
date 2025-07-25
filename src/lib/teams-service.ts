import type { UserTeam, PlayerProfile, TeamMember, AppNotification } from '@/types';
import { firestore } from './firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, runTransaction, writeBatch } from 'firebase/firestore';
import { createNotification, updateNotificationStatus } from './notifications-service';

const teamsCollection = collection(firestore, 'teams');
const usersCollection = collection(firestore, 'users');

export const getTeamStream = (teamId: string, callback: (team: UserTeam | null) => void) => {
  if (!teamId) {
    callback(null);
    return () => {};
  }
  const teamDocRef = doc(teamsCollection, teamId);
  const unsubscribe = onSnapshot(teamDocRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as UserTeam);
    } else {
      callback(null);
    }
  });
  return unsubscribe;
}

export const createTeam = async (leaderProfile: PlayerProfile, teamName: string) => {
    if (!leaderProfile) return { success: false, error: "User profile not found." };
    if (leaderProfile.teamId) return { success: false, error: "User is already in a team." };

    const newTeamRef = doc(teamsCollection);
    const newTeam: Omit<UserTeam, 'id'> = {
        name: teamName,
        leaderId: leaderProfile.id,
        avatar: leaderProfile.avatar || `https://api.dicebear.com/8.x/bottts/svg?seed=${newTeamRef.id}`,
        dataAiHint: "team logo",
        members: [{
            uid: leaderProfile.id,
            name: leaderProfile.name,
            gamerId: leaderProfile.gamerId,
            avatar: leaderProfile.avatar,
            role: 'Leader'
        }],
        memberGamerIds: [leaderProfile.gamerId],
    };

    const userRef = doc(usersCollection, leaderProfile.id);
    
    const batch = writeBatch(firestore);
    batch.set(newTeamRef, newTeam);
    batch.update(userRef, { teamId: newTeamRef.id });

    try {
        await batch.commit();
        return { success: true, teamId: newTeamRef.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const sendTeamInvite = async (inviterProfile: PlayerProfile, inviteeProfile: PlayerProfile, team: UserTeam) => {
    if (team.members.length >= 5) return { success: false, error: "The team is already full (max 5 members)." };
    if (team.members.some(m => m.uid === inviteeProfile.id)) return { success: false, error: `${inviteeProfile.name} is already in the team.` };
    if (inviteeProfile.teamId) return { success: false, error: `${inviteeProfile.name} is already in another team.` };

    const notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'> = {
        userId: inviteeProfile.id,
        type: 'team_invite',
        title: `Team Invitation`,
        description: `${inviterProfile.name} has invited you to join team "${team.name}".`,
        link: '/profile',
        from: { uid: inviterProfile.id, name: inviterProfile.name },
        team: { id: team.id, name: team.name },
        status: 'pending',
    }

    return createNotification(notification);
}

export const respondToInvite = async (notificationId: string, acceptingUserProfile: PlayerProfile, teamId: string, response: 'accepted' | 'rejected', fromUid: string) => {
    const teamDocRef = doc(teamsCollection, teamId);
    const userDocRef = doc(usersCollection, acceptingUserProfile.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            const teamDoc = await transaction.get(teamDocRef);
            if (!teamDoc.exists()) throw new Error("Team no longer exists.");
            
            const teamData = teamDoc.data() as UserTeam;

            if (response === 'accepted') {
                if (teamData.members.length >= 5) throw new Error("The team is now full.");
                if (teamData.members.some(m => m.uid === acceptingUserProfile.id)) throw new Error("You are already in this team.");
                
                const acceptingUserDoc = await transaction.get(userDocRef);
                if (acceptingUserDoc.exists() && acceptingUserDoc.data().teamId) {
                    throw new Error("You are already in another team.");
                }

                const newMember: TeamMember = {
                    uid: acceptingUserProfile.id,
                    name: acceptingUserProfile.name,
                    gamerId: acceptingUserProfile.gamerId,
                    avatar: acceptingUserProfile.avatar,
                    role: 'Member'
                };

                const updatedMembers = [...teamData.members, newMember];
                const updatedGamerIds = [...teamData.memberGamerIds, acceptingUserProfile.gamerId];

                transaction.update(teamDocRef, { members: updatedMembers, memberGamerIds: updatedGamerIds });
                transaction.update(userDocRef, { teamId: teamId });
            }
        });

        // After transaction is successful
        await updateNotificationStatus(notificationId, response);
        await createNotification({
            userId: fromUid,
            type: 'invite_response',
            title: `Invite ${response}`,
            description: `${acceptingUserProfile.name} has ${response} your invitation to join ${teamId}.`,
            link: '/profile',
            response: response
        });
        
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const addMemberManually = async (teamId: string, memberGamerId: string, memberName: string) => {
    const teamDocRef = doc(teamsCollection, teamId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const teamDoc = await transaction.get(teamDocRef);
            if (!teamDoc.exists()) throw new Error("Team not found.");
            const teamData = teamDoc.data() as UserTeam;

            if (teamData.members.length >= 5) throw new Error("Team is already full.");
            if (teamData.memberGamerIds.includes(memberGamerId)) throw new Error("Player with this Gamer ID is already in the team.");

            const newMember: TeamMember = { name: memberName, gamerId: memberGamerId, role: 'Member' };
            const updatedMembers = [...teamData.members, newMember];
            const updatedGamerIds = [...teamData.memberGamerIds, memberGamerId];
            
            transaction.update(teamDocRef, { members: updatedMembers, memberGamerIds: updatedGamerIds });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const leaveTeam = async (userId: string, teamId: string) => {
    const teamDocRef = doc(teamsCollection, teamId);
    const userDocRef = doc(usersCollection, userId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const teamDoc = await transaction.get(teamDocRef);
            const userDoc = await transaction.get(userDocRef);

            if (!teamDoc.exists() || !userDoc.exists()) throw new Error("Could not find team or user.");
            
            const teamData = teamDoc.data() as UserTeam;
            const userData = userDoc.data() as PlayerProfile;

            if (teamData.leaderId === userId && teamData.members.length > 1) {
                throw new Error("Leader must transfer leadership before leaving, or be the last member.");
            }

            const updatedMembers = teamData.members.filter(m => m.uid !== userId);
            const updatedGamerIds = teamData.memberGamerIds.filter(id => id !== userData.gamerId);

            transaction.update(userDocRef, { teamId: '' });
            
            if (updatedMembers.length === 0) {
                transaction.delete(teamDocRef);
            } else {
                transaction.update(teamDocRef, { members: updatedMembers, memberGamerIds: updatedGamerIds });
            }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const updateTeamMember = async (teamId: string, oldGamerId: string, updatedMember: { name: string, gamerId: string }) => {
    const teamDocRef = doc(teamsCollection, teamId);
    try {
        await runTransaction(firestore, async (transaction) => {
            const teamDoc = await transaction.get(teamDocRef);
            if (!teamDoc.exists()) throw new Error("Team not found.");
            const teamData = teamDoc.data() as UserTeam;

            const memberIndex = teamData.members.findIndex(m => m.gamerId === oldGamerId);
            if (memberIndex === -1) throw new Error("Member not found.");

            // Check if new gamerId already exists (if it's being changed)
            if (oldGamerId !== updatedMember.gamerId && teamData.memberGamerIds.includes(updatedMember.gamerId)) {
                throw new Error("A member with this Gamer ID already exists in the team.");
            }

            const newMembers = [...teamData.members];
            newMembers[memberIndex] = { ...newMembers[memberIndex], ...updatedMember };
            
            const newGamerIds = teamData.memberGamerIds.map(id => id === oldGamerId ? updatedMember.gamerId : id);
            
            transaction.update(teamDocRef, { members: newMembers, memberGamerIds: newGamerIds });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const removeMemberFromTeam = async (teamId: string, memberGamerId: string) => {
    const teamDocRef = doc(teamsCollection, teamId);
    try {
        await runTransaction(firestore, async (transaction) => {
            const teamDoc = await transaction.get(teamDocRef);
            if (!teamDoc.exists()) throw new Error("Team not found.");
            const teamData = teamDoc.data() as UserTeam;

            const memberToRemove = teamData.members.find(m => m.gamerId === memberGamerId);
            if (!memberToRemove) throw new Error("Member not found.");
            
            // Cannot remove the leader
            if (memberToRemove.uid === teamData.leaderId) {
                throw new Error("Cannot remove the team leader.");
            }

            const updatedMembers = teamData.members.filter(m => m.gamerId !== memberGamerId);
            const updatedGamerIds = teamData.memberGamerIds.filter(id => id !== memberGamerId);

            transaction.update(teamDocRef, { members: updatedMembers, memberGamerIds: updatedGamerIds });

            // If the removed member was a registered user, update their profile
            if (memberToRemove.uid) {
                const userDocRef = doc(usersCollection, memberToRemove.uid);
                transaction.update(userDocRef, { teamId: '' });
            }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
