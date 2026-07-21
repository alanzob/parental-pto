"use client";

import { useEffect, useState } from "react";
import { RESEARCH_NOTES } from "@/lib/research-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROTATE_MS = 12_000;

export function ResearchNotesWidget() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % RESEARCH_NOTES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const note = RESEARCH_NOTES[index];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-tag">Equity &amp; Partnership Research</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{note.text}</p>
        <p className="text-muted-foreground mt-2 text-xs">— {note.source}</p>
      </CardContent>
    </Card>
  );
}
