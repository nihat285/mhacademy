import Link from "next/link";
import type { TopicNode } from "@/lib/queries/catalog";

function Nodes({ nodes, subjectSlug, depth }: { nodes: TopicNode[]; subjectSlug: string; depth: number }) {
  return (
    <ul className={depth > 0 ? "mt-1 ml-3 space-y-1 border-l border-border pl-4" : "space-y-1"}>
      {nodes.map((n) => (
        <li key={n.id}>
          <Link
            href={`/dersler?fen=${encodeURIComponent(subjectSlug)}&movzu=${encodeURIComponent(n.slug)}`}
            className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-surface-2"
          >
            <span className={depth === 0 ? "font-semibold" : ""}>{n.name}</span>
            <span className="shrink-0 text-xs text-muted group-hover:text-accent-ink">{n.lessonCount} dərs</span>
          </Link>
          {n.children.length > 0 && <Nodes nodes={n.children} subjectSlug={subjectSlug} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export function TopicTree({ nodes, subjectSlug }: { nodes: TopicNode[]; subjectSlug: string }) {
  return <Nodes nodes={nodes} subjectSlug={subjectSlug} depth={0} />;
}
