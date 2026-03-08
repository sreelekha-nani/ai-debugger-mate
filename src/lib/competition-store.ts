// Competition state management using localStorage + React state

export interface Participant {
  id: string;
  name: string;
  team: string;
  score: number;
  bugsFixed: number;
  totalBugs: number;
  accuracy: number;
  timeSpent: number; // seconds
  submittedAt: number | null;
}

export interface Challenge {
  title: string;
  description: string;
  buggyCode: string;
  correctCode: string;
  bugs: { line: number; description: string; type: string }[];
  testCases: { input: string; expectedOutput: string }[];
  hints?: string[];
}

export interface CompetitionSession {
  participantId: string;
  participantName: string;
  team: string;
  language: string;
  difficulty: string;
  challenge: Challenge | null;
  startTime: number | null;
  duration: number; // seconds
  submitted: boolean;
  tabSwitchCount: number;
}

const LEADERBOARD_KEY = "debugchallenge_leaderboard";
const SESSION_KEY = "debugchallenge_session";

export function getLeaderboard(): Participant[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToLeaderboard(participant: Participant): Participant[] {
  const leaderboard = getLeaderboard();
  const existing = leaderboard.findIndex((p) => p.id === participant.id);
  if (existing >= 0) {
    leaderboard[existing] = participant;
  } else {
    leaderboard.push(participant);
  }
  // Sort: highest score first, then fastest time
  leaderboard.sort((a, b) => {
    const scoreA = a.accuracy * 10 + a.bugsFixed * 20 - a.timeSpent * 0.1;
    const scoreB = b.accuracy * 10 + b.bugsFixed * 20 - b.timeSpent * 0.1;
    return scoreB - scoreA;
  });
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
  return leaderboard;
}

export function getSession(): CompetitionSession | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: CompetitionSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
