// All parsing of the incident brief lives in this file.
// Real format: bold headings (**SUMMARY**), and citations as [alrt_x, alrt_y] at the end of a line.

export interface Citation {
  n: number;
  valid: boolean;
  claim: string;
  alertId: string;
}

export type LineKind = "preamble" | "heading" | "claim" | "citation" | "text" | "blank";

export interface BriefLine {
  kind: LineKind;
  text: string;
  bullet: boolean;
  chips: number[];
  badMarkers: string[];
  citationN?: number;
}

export interface ParsedBrief {
  lines: BriefLine[];
  citations: Citation[];
  complete: boolean;
}

// Only this section holds claims that must be backed by citations.
const EVIDENCE_SECTION = "evidence";
const ID_GROUP = /\[\s*(alrt_[\w-]+(?:\s*,\s*alrt_[\w-]+)*)\s*\]/gi;
const BOLD_HEADING = /^\*\*([^*]+)\*\*:?$/;

function makeLine(kind: LineKind, text: string, bullet = false): BriefLine {
  return { kind, text, bullet, chips: [], badMarkers: [] };
}

function headingName(t: string): string | null {
  if (t.startsWith("## ")) return t.slice(3).trim();
  const m = BOLD_HEADING.exec(t);
  return m ? m[1].trim() : null;
}

function plain(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

export function parseBrief(text: string, complete: boolean): ParsedBrief {
  const rawLines = text.split("\n");
  const lastIndex = rawLines.length - 1;
  const citations: Citation[] = [];
  const numbers = new Map<string, number>();
  const lines: BriefLine[] = [];
  let section: string | null = null;

  rawLines.forEach((line, idx) => {
    let t = line.trim();
    // While streaming, hide a half-written [alrt_... marker on the last line.
    if (!complete && idx === lastIndex) t = t.replace(/\[[^\]]*$/, "").trim();
    if (t === "") {
      lines.push(makeLine("blank", ""));
      return;
    }

    const h = headingName(t);
    if (h !== null) {
      section = h.toLowerCase();
      lines.push(makeLine("heading", h));
      return;
    }

    const bullet = /^[-*]\s+/.test(t);
    const body = bullet ? t.replace(/^[-*]\s+/, "") : t;

    if (section === null) {
      lines.push(makeLine("preamble", plain(body), bullet));
      return;
    }

    const ids: string[] = [];
    const stripped = body.replace(ID_GROUP, (_m: string, group: string) => {
      for (const id of group.split(",")) ids.push(id.trim());
      return "";
    });
    const clean = plain(stripped)
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([.,;])/g, "$1")
      .trim();

    const out = makeLine(section === EVIDENCE_SECTION ? "claim" : "text", clean, bullet);
    for (const id of ids) {
      let n = numbers.get(id);
      if (n === undefined) {
        n = citations.length + 1;
        numbers.set(id, n);
        citations.push({ n, valid: true, claim: clean, alertId: id });
      }
      if (!out.chips.includes(n)) out.chips.push(n);
    }
    lines.push(out);
  });

  return { lines, citations, complete };
}
