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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse font-mono text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="label-tag text-muted-foreground px-3 py-2 text-left font-normal sm:px-4">
                  Metric
                </th>
                <th className="label-tag px-3 py-2 text-right font-normal sm:px-4">{labelA}</th>
                <th className="label-tag px-3 py-2 text-right font-normal sm:px-4">{labelB}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-border/60 border-b">
                  <td className="text-muted-foreground px-3 py-2 sm:px-4">{r.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">{r.a}</td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">{r.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {footer && (
          <p className="text-muted-foreground border-border border-t px-4 py-2 text-xs">
            {footer}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
