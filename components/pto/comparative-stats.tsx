import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type StatRow = { label: string; a: string; b: string };

export function ComparativeStats({
  title = "Comparative Ledger",
  labelA,
  labelB,
  rows,
  footer,
}: {
  title?: string;
  labelA: string;
  labelB: string;
  rows: StatRow[];
  footer?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-tag">
          {title} — {labelA} vs. {labelB}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="label-tag text-muted-foreground px-4 py-2 text-left font-normal">
                Metric
              </th>
              <th className="label-tag px-4 py-2 text-right font-normal">{labelA}</th>
              <th className="label-tag px-4 py-2 text-right font-normal">{labelB}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-border/60 border-b">
                <td className="text-muted-foreground px-4 py-2">{r.label}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.a}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {footer && (
          <p className="text-muted-foreground border-border border-t px-4 py-2 text-xs">
            {footer}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
