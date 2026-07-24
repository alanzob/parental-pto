// Site-wide pause switch. Flip back to false and push to bring MyTO back
// online — this flag is the entire mechanism; nothing else is touched, no
// code deleted, no data affected. See proxy.ts for where it's enforced.
export const MAINTENANCE_MODE = true;
