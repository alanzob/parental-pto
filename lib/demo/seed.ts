import { computeDuration, type DemoRequest } from "./types";

// Both trips are Brian's — he's away, so Vanda banks the equivalent
// no-parenting credit for each once "approved".
export function seedDemoRequests(): DemoRequest[] {
  const caliStart = "2026-10-22T00:00:00";
  const caliEnd = "2026-10-26T12:00:00";
  const ncStart = "2026-10-02T00:00:00";
  const ncEnd = "2026-10-04T12:00:00";

  const cali = computeDuration(caliStart, caliEnd);
  const nc = computeDuration(ncStart, ncEnd);

  return [
    {
      id: "seed-cali",
      title: "Trip to Cali",
      requestedBy: "brian",
      creditedTo: "vanda",
      offDutyStart: caliStart,
      backOnDuty: caliEnd,
      fullDays: cali.fullDays,
      hours: cali.hours,
      status: "approved",
      createdAt: "2026-09-15T09:00:00.000Z",
    },
    {
      id: "seed-nc",
      title: "Trip to NC",
      requestedBy: "brian",
      creditedTo: "vanda",
      offDutyStart: ncStart,
      backOnDuty: ncEnd,
      fullDays: nc.fullDays,
      hours: nc.hours,
      status: "approved",
      createdAt: "2026-09-01T09:00:00.000Z",
    },
  ];
}
