// All parsing of the incident brief lives in this file.
// Parts marked MOCK only work for the fixed sample brief the backend streams today.
// When the real AI agent's format is known, change the MOCK parts only.

export interface Citation {
  n: number;
  valid: boolean;
  raw: string;
  claim: string;
  field: string;
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

// MOCK: the section that lists the citations.
const CITATION_SECTION = "citations";
// MOCK: one citation per line, for example:
// - Claim: '7 failed login attempts' -> traced to raw_log field on alert alrt_x
const CITATION_LINE =
  /^-\s*Claim:\s*['"](.+)['"]\s*->\s*traced to\s+(\S+)\s+field on alert\s+(\S+)\s*$/i;
// REAL-READY: inline markers such as [1] inside a sentence.
const INLINE_MARKER = /\[(\d{1,3})\]/g;

function wordSet(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

// MOCK heuristic: the mock brief has no markers, so a sentence counts as backed by a
// citation when it contains every word of the citation's claim.
function mentionsClaim(line: string, claim: string): boolean {
  const need = wordSet(claim);
  if (need.size === 0) return false;
  const have = wordSet(line);
  for (const w of need) {
    if (!have.has(w)) return false;
  }
  return true;
}

function headingName(t: string): string | null {
  return t.startsWith("## ") ? t.slice(3).trim().toLowerCase() : null;
}

function makeLine(kind: LineKind, text: string, bullet = false): BriefLine {
  return { kind, text, bullet, chips: [], badMarkers: [] };
}

export function parseBrief(text: string, complete: boolean): ParsedBrief {
  const rawLines = text.split("\n");
  const lastIndex = rawLines.length - 1;
  const citations: Citation[] = [];

  // Pass 1: collect the citation entries.
  let inCitations = false;
  rawLines.forEach((line, idx) => {
    const t = line.trim();
    const h = headingName(t);
    if (h !== null) {
      inCitations = h === CITATION_SECTION;
      return;
    }
    if (!inCitations || !t.startsWith("- ")) return;
    // While streaming, the last line may be half written. Skip it.
    if (!complete && idx === lastIndex) return;

    const m = CITATION_LINE.exec(t);
    const n = citations.length + 1;
    citations.push(
      m
        ? { n, valid: true, raw: t.slice(2), claim: m[1], field: m[2], alertId: m[3] }
        : { n, valid: false, raw: t.slice(2), claim: "", field: "", alertId: "" },
    );
  });

  // Pass 2: build the display lines and link claims to citations.
  const valid = citations.filter((c) => c.valid);
  const known = new Set(valid.map((c) => c.n));
  const link = complete || citations.length > 0;
  const lines: BriefLine[] = [];
  let section: string | null = null;
  let nextCitation = 0;

  for (const line of rawLines) {
    const t = line.trim();
    if (t === "") {
      lines.push(makeLine("blank", ""));
      continue;
    }
    const h = headingName(t);
    if (h !== null) {
      section = h;
      lines.push(makeLine("heading", t.slice(3).trim()));
      continue;
    }
    const bullet = t.startsWith("- ");
    const body = bullet ? t.slice(2) : t;

    if (section === null) {
      lines.push(makeLine("preamble", body, bullet));
      continue;
    }

    if (section === CITATION_SECTION) {
      if (bullet && nextCitation < citations.length) {
        const entry = makeLine("citation", body, bullet);
        entry.citationN = citations[nextCitation].n;
        lines.push(entry);
        nextCitation += 1;
      } else {
        lines.push(makeLine("text", body, bullet));
      }
      continue;
    }

    // Every other section holds claims that should be backed by a citation.
    const claimLine = makeLine("claim", body, bullet);
    if (link) {
      claimLine.text = body
        .replace(INLINE_MARKER, (marker: string, digits: string) => {
          const n = Number(digits);
          if (known.has(n)) {
            if (!claimLine.chips.includes(n)) claimLine.chips.push(n);
            return "";
          }
          if (complete) {
            claimLine.badMarkers.push(marker);
            return "";
          }
          return marker;
        })
        .replace(/\s{2,}/g, " ")
        .trim();

      if (claimLine.chips.length === 0 && claimLine.badMarkers.length === 0) {
        for (const c of valid) {
          if (mentionsClaim(claimLine.text, c.claim)) claimLine.chips.push(c.n);
        }
      }
    }
    lines.push(claimLine);
  }

  return { lines, citations, complete };
}
