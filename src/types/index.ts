
import type { Timestamp } from 'firebase/firestore';

export type Game = string;

export interface GameCategory {
  id: string;
  name: string;
  categories: string;
  image: string;
  dataAiHint?: string;
  description?: string;
}

export interface Team {
  id: string;
  name: string;
  avatar: string;
  dataAiHint?: string;
  members?: TeamMember[];
}

export interface Match {
  id: string;
  name: string;
  teams: [Team | null, Team | null];
  scores: [number, number];
  status: 'pending' | 'live' | 'completed';
  resultSubmissionStatus?: { [teamId: string]: 'pending' | 'submitted' | 'approved' | 'rejected' };
  roomId?: string;
  roomPass?: string;
}

export interface Round {
  name: string;
  matches: Match[];
}

export interface PlacementPoint {
  place: number;
  points: number;
}

export interface PointSystem {
  perKillPoints: number;
  placementPoints: PlacementPoint[];
}

export interface Tournament {
  id: string;
  name: string;
  game: Game;
  startDate: Timestamp | string;
  teamsCount: number;
  maxTeams: number;
  entryFee: number;
  prizePool: string;
  rules: string;
  status: 'upcoming' | 'live' | 'completed';
  participants: Team[];
  bracket: Round[];
  image: string;
  dataAiHint?: string;
  format: string;
  perKillPrize?: number;
  map?: string;
  version?: string;
  createdAt?: Timestamp | string;
  pointSystemEnabled?: boolean;
  pointSystem?: PointSystem;
  tournamentName?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface FeaturedBanner {
  id: string;
  game: string;
  name: string;
  date: string;
  image: string;
  dataAiHint: string;
  createdAt?: Timestamp | string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  banner?: string;
  gameName?: string;
  gamerId: string;
  joined: Timestamp | string;
  role: string;
  winrate: number;
  games: number;
  wins?: number;
  balance: number;
  pendingBalance: number;
  teamId?: string;
  status: 'active' | 'banned';
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'prize' | 'fee' | 'admin_adjustment';
  description: string;
  date: Timestamp | string;
  status?: 'COMPLETED' | 'PENDING' | 'FAILED';
  gatewayTransactionId?: string;
}

export interface Order {
    id?: string;
    userId: string;
    amount: number;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    tran_id: string;
    createdAt?: Timestamp;
}

export interface MatchResult {
  id: string;
  tournamentId: string;
  tournamentName: string;
  matchId: string;
  roundName: string;
  teamId: string;
  teamName: string;
  kills: number;
  position: number;
  screenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp | string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  description: string;
  link: string;
  read: boolean;
  createdAt: Timestamp | string;
  type?: 'generic' | 'team_invite' | 'invite_response';
  from?: { uid: string; name:string; };
  team?: { id: string; name: string; };
  status?: 'pending' | 'accepted' | 'rejected';
  response?: 'accepted' | 'rejected';
}

export type TeamType = 'SOLO' | 'DUO' | 'SQUAD';

export interface RegistrationLog {
  id: string;
  tournamentId: string;
  tournamentName: string;
  game: string;
  teamName: string;
  teamType: TeamType;
  players: { name: string; gamerId: string }[];
  status: 'approved';
  registeredAt: Timestamp | string;
}

export interface TeamMember {
  uid?: string;
  name: string;
  gamerId: string;
  avatar?: string;
  role: 'Leader' | 'Member';
}

export interface UserTeam {
  id: string;
  name: string;
  avatar: string;
  dataAiHint?: string;
  leaderId: string;
  members: TeamMember[];
  memberGamerIds: string[];
}

export interface WithdrawMethod {
  id: string;
  image?: string;
  name: string;
  feePercentage: number;
  minAmount: number;
  maxAmount: number;
  status: 'active' | 'inactive';
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  userName: string;
  userGamerId: string;
  amount: number;
  method: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp | string;
}

export interface PendingPrize {
  id: string;
  userId: string;
  userName: string;
  userGamerId: string;
  amount: number;
  tournamentId: string;
  tournamentName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp | string;
}

export interface TopupMethod {
  id: string;
  name: string;
  image?: string;
  accountNumber: string;
  instructions: string;
  status: 'active' | 'inactive';
}

export interface TopupRequest {
  id: string;
  userId: string;
  userName: string;
  userGamerId: string;
  amount: number;
  method: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp | string;
}


// --- Gateway Settings ---

export interface NagorikPaySettings {
  accessToken: string;
  successUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
}

export interface GatewaySettings {
  nagorikPay: NagorikPaySettings;
}
