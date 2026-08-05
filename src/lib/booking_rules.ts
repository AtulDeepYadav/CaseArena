/**
 * booking_rules.ts
 * Implements heuristic rules for capacity limits and transaction handling
 * for EPIC-03 CaseArena Collaborative Sessions.
 */

export const BOOKING_CONSTRAINTS = {
  MAX_SEATS_PER_SESSION: 4, // Host, Interviewer, Candidate, Observer
  MIN_SEATS_PER_SESSION: 2, // At least Host/Interviewer and Candidate
  MAX_OBSERVERS: 2,
};

export const ROLES = {
  HOST: 'host',
  INTERVIEWER: 'interviewer',
  CANDIDATE: 'candidate',
  OBSERVER: 'observer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Validates if a user can join a session based on current participants.
 * This is used defensively on the frontend, but the actual atomic check
 * must happen via Supabase transactions/RPC to prevent race conditions.
 */
export function canJoinSession(
  requestedRole: Role,
  currentParticipants: { role: Role }[],
  maxSeats: number = BOOKING_CONSTRAINTS.MAX_SEATS_PER_SESSION
): boolean {
  if (currentParticipants.length >= maxSeats) {
    return false; // Session is full
  }

  const roleCounts = currentParticipants.reduce(
    (acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1;
      return acc;
    },
    {} as Record<Role, number>
  );

  switch (requestedRole) {
    case ROLES.HOST:
      return (roleCounts[ROLES.HOST] || 0) < 1; // Only 1 host
    case ROLES.INTERVIEWER:
      // Host usually doubles as interviewer, but if they assign it:
      return (roleCounts[ROLES.INTERVIEWER] || 0) < 1; 
    case ROLES.CANDIDATE:
      return (roleCounts[ROLES.CANDIDATE] || 0) < 1; // Only 1 candidate
    case ROLES.OBSERVER:
      return (roleCounts[ROLES.OBSERVER] || 0) < BOOKING_CONSTRAINTS.MAX_OBSERVERS;
    default:
      return false;
  }
}
