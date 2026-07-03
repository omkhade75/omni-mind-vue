import type { ReactNode } from "react";
import { PageHeader, SectionCard } from "./page-header";
import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  sections: { title: string; desc: string; rows?: { label: string; v: string }[] }[];
  aiNote?: string;
}

export function ScaffoldPage({ title, subtitle, sections, aiNote }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      {aiNote && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="h-4 w-4" /> AI insight
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{aiNote}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <SectionCard key={s.title} title={s.title} subtitle={s.desc}>
            {s.rows ? (
              <ul className="space-y-2 text-xs">
                {s.rows.map((r) => (
                  <li key={r.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-semibold">{r.v}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Coming next iteration.</p>
            )}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
