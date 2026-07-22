// Small blueprint-style illustrations for the how-it-works walkthrough.
// Same visual language as app-logo.tsx: currentColor strokes, sharp corners,
// no fills beyond the occasional accent — technical-drawing, not friendly-app.

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
    >
      {children}
    </svg>
  );
}

export function IconImbalance() {
  return (
    <Frame>
      <line x1="60" y1="18" x2="60" y2="76" stroke="currentColor" strokeWidth="1.5" />
      <line x1="38" y1="94" x2="82" y2="94" stroke="currentColor" strokeWidth="1.5" />
      <line x1="60" y1="76" x2="60" y2="94" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="30" r="2.5" fill="currentColor" />
      <g transform="rotate(-16 60 30)">
        <line x1="24" y1="30" x2="96" y2="30" stroke="currentColor" strokeWidth="1.5" />
        <line x1="24" y1="30" x2="24" y2="52" stroke="currentColor" strokeWidth="1" />
        <line x1="96" y1="30" x2="96" y2="46" stroke="currentColor" strokeWidth="1" />
        <path
          d="M14 52 a10 8 0 0 0 20 0 Z"
          fill="var(--muted-foreground)"
          fillOpacity="0.35"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path d="M87 46 a9 6 0 0 0 18 0 Z" fill="none" stroke="currentColor" strokeWidth="1" />
      </g>
    </Frame>
  );
}

export function IconBlankLedger() {
  return (
    <Frame>
      <rect x="30" y="20" width="60" height="80" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="38"
        y1="36"
        x2="82"
        y2="36"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line
        x1="38"
        y1="48"
        x2="82"
        y2="48"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line
        x1="38"
        y1="60"
        x2="82"
        y2="60"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <circle cx="60" cy="78" r="14" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="60"
        y="84"
        textAnchor="middle"
        fontSize="16"
        fontFamily="monospace"
        fill="currentColor"
      >
        ?
      </text>
    </Frame>
  );
}

export function IconLedgerBalanced() {
  return (
    <Frame>
      <rect x="22" y="22" width="76" height="76" stroke="currentColor" strokeWidth="1.5" />
      <line x1="22" y1="38" x2="98" y2="38" stroke="currentColor" strokeWidth="1" />
      <rect x="36" y="52" width="14" height="34" fill="currentColor" fillOpacity="0.85" />
      <rect x="70" y="52" width="14" height="34" fill="currentColor" fillOpacity="0.4" />
    </Frame>
  );
}

export function IconDuration() {
  return (
    <Frame>
      <circle cx="60" cy="52" r="28" stroke="currentColor" strokeWidth="1.5" />
      <line x1="60" y1="52" x2="60" y2="34" stroke="currentColor" strokeWidth="1.5" />
      <line x1="60" y1="52" x2="74" y2="60" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="52" r="1.8" fill="currentColor" />
      <line x1="28" y1="98" x2="92" y2="98" stroke="currentColor" strokeWidth="1" />
      <line x1="28" y1="94" x2="28" y2="102" stroke="currentColor" strokeWidth="1" />
      <line x1="92" y1="94" x2="92" y2="102" stroke="currentColor" strokeWidth="1" />
    </Frame>
  );
}

export function IconCreditTransfer() {
  return (
    <Frame>
      <rect x="14" y="30" width="34" height="26" stroke="currentColor" strokeWidth="1.5" />
      <rect
        x="72"
        y="64"
        width="34"
        height="26"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M46 50 C 66 62, 66 62, 78 74"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        markerEnd="url(#arrow)"
      />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
        </marker>
      </defs>
      <text
        x="89"
        y="82"
        textAnchor="middle"
        fontSize="12"
        fontFamily="monospace"
        fill="currentColor"
      >
        +
      </text>
    </Frame>
  );
}

export function IconCalendarGrid() {
  const cells = [
    "a",
    "n",
    "n",
    "b",
    "n",
    "n",
    "a",
    "n",
    "b",
    "b",
    "n",
    "a",
    "n",
    "n",
    "b",
  ];
  const colorA = "#1a6b3c";
  const colorB = "#6a3fa0";
  return (
    <Frame>
      <rect x="18" y="18" width="84" height="84" stroke="currentColor" strokeWidth="1.5" />
      {cells.map((c, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const x = 22 + col * 15.6;
        const y = 22 + row * 25.3;
        const fill = c === "a" ? colorA : c === "b" ? colorB : "none";
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="13.6"
            height="21.3"
            fill={fill === "none" ? "transparent" : fill}
            fillOpacity={fill === "none" ? 0 : 0.75}
            stroke="currentColor"
            strokeOpacity="0.4"
            strokeWidth="0.75"
          />
        );
      })}
    </Frame>
  );
}

export function IconFairBalance() {
  return (
    <Frame>
      <line x1="60" y1="18" x2="60" y2="76" stroke="currentColor" strokeWidth="1.5" />
      <line x1="38" y1="94" x2="82" y2="94" stroke="currentColor" strokeWidth="1.5" />
      <line x1="60" y1="76" x2="60" y2="94" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="30" r="2.5" fill="currentColor" />
      <line x1="24" y1="30" x2="96" y2="30" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="30" x2="24" y2="46" stroke="currentColor" strokeWidth="1" />
      <line x1="96" y1="30" x2="96" y2="46" stroke="currentColor" strokeWidth="1" />
      <path d="M14 46 a10 7 0 0 0 20 0 Z" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M86 46 a10 7 0 0 0 20 0 Z" fill="none" stroke="currentColor" strokeWidth="1" />
      <path
        d="M50 62 l7 7 l13 -14"
        stroke="var(--success)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  );
}
