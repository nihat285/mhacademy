/**
 * Turns the text of a test book / exam PDF into draft multiple-choice questions.
 *
 * Recognised layout (the usual Azerbaijani test format):
 *   1. Question text ...            <- number followed by "." or ")"
 *   A) ...  B) ...  C) ...  D) ... <- options, on separate lines or all on one line (A–E)
 *   ...
 *   Cavablar: 1-A 2-C 3-B ...       <- answer key at the end ("1.A", "1) A", "1 A" also work)
 * An answer inside a question ("Cavab: B", "Düzgün cavab: C") is used too.
 * This is a pure function with no I/O, so it can be unit-tested and run on pasted text as well.
 */

export interface DraftQuestion {
  /** Number printed in the source. */
  no: number;
  text: string;
  options: string[];
  /** Index of the correct option, or null when the source gives no answer. */
  correct: number | null;
}

export interface ImportResult {
  questions: DraftQuestion[];
  /** Human-readable notes about things the parser could not work out. */
  notes: string[];
}

const LETTERS = ["A", "B", "C", "D", "E"] as const;
const KEY_HEADING = /^\s*(?:düzgün\s+)?(?:cavab(?:lar)?(?:\s+açarı)?|açar|answers?(?:\s+key)?|key)\s*[:.]?\s*$|^\s*(?:düzgün\s+)?cavablar\s*[:.]/i;
const KEY_PAIR = /(\d{1,3})\s*[-–—.:)]*\s*\(?([A-Ea-e])\)?(?![A-Za-zƏəİıÖöÜüŞşÇçĞğ])/g;
const KEY_LINE = /^(?:\s*\d{1,3}\s*[-–—.:)]*\s*\(?[A-Ea-e]\)?\s*[,;]?)+\s*$/;
const QUESTION_START = /^\s*(\d{1,3})\s*[.)]\s*(\S.*)$/;
const INLINE_ANSWER = /(?:düzgün\s+)?cavab\s*[:\-–]\s*\(?([A-Ea-e])\)?\s*[.)]?\s*$/i;

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Splits the answer key off the end of the document. */
function splitKey(lines: string[]): { body: string[]; key: [number, number][] } {
  let start = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (KEY_HEADING.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) {
    // No heading: a trailing run of lines that are nothing but "1-A 2-B ..." pairs.
    let i = lines.length;
    while (i > 0 && (lines[i - 1].trim() === "" || KEY_LINE.test(lines[i - 1]))) i--;
    if (i < lines.length && lines.slice(i).join(" ").match(KEY_PAIR)?.length) start = i;
  }
  if (start === -1) return { body: lines, key: [] };
  const keyText = lines.slice(start).join(" ").replace(KEY_HEADING, " ");
  const key: [number, number][] = [];
  for (const m of keyText.matchAll(KEY_PAIR)) key.push([Number(m[1]), LETTERS.indexOf(m[2].toUpperCase() as (typeof LETTERS)[number])]);
  return { body: lines.slice(0, start), key };
}

/** Finds A) B) C)… in order inside one question block. Returns the question stem and the option texts. */
function splitOptions(block: string): { stem: string; options: string[] } {
  const marks: { letter: number; at: number; end: number }[] = [];
  let from = 0;
  for (let li = 0; li < LETTERS.length; li++) {
    const re = new RegExp(`(?<![A-Za-z0-9ƏəİıÖöÜüŞşÇçĞğ])\\(?${LETTERS[li]}[).]\\s*`, "g");
    re.lastIndex = from;
    const m = re.exec(block);
    if (!m) break;
    marks.push({ letter: li, at: m.index, end: m.index + m[0].length });
    from = m.index + m[0].length;
  }
  if (marks.length < 2) return { stem: squash(block), options: [] };
  const options = marks.map((m, i) => squash(block.slice(m.end, i + 1 < marks.length ? marks[i + 1].at : undefined)));
  return { stem: squash(block.slice(0, marks[0].at)), options };
}

export function parseQuestionsFromText(raw: string): ImportResult {
  const notes: string[] = [];
  const lines = raw.replace(/\r/g, "").replace(/ /g, " ").split("\n");
  const { body, key } = splitKey(lines);

  // Group lines into question blocks using the running question number (so numbers inside a question do not split it).
  const blocks: { no: number; lines: string[] }[] = [];
  let last = 0;
  for (const line of body) {
    const m = QUESTION_START.exec(line);
    if (m) {
      const n = Number(m[1]);
      const starts = blocks.length === 0 ? n >= 1 && n <= 5 : n === last + 1 || n === 1;
      if (starts) {
        blocks.push({ no: n, lines: [m[2]] });
        last = n;
        continue;
      }
    }
    if (blocks.length) blocks[blocks.length - 1].lines.push(line);
  }

  const used = new Map<number, number>(); // how many times each number has been seen (restarting numbering)
  const questions: DraftQuestion[] = [];
  for (const b of blocks) {
    let text = b.lines.join("\n");
    let correct: number | null = null;
    const inline = INLINE_ANSWER.exec(text.trimEnd());
    if (inline) {
      correct = LETTERS.indexOf(inline[1].toUpperCase() as (typeof LETTERS)[number]);
      text = text.slice(0, inline.index);
    }
    const { stem, options } = splitOptions(text);
    if (correct === null) {
      const nth = used.get(b.no) ?? 0;
      used.set(b.no, nth + 1);
      const hits = key.filter(([n]) => n === b.no);
      const hit = hits[nth] ?? hits[hits.length - 1];
      if (hit) correct = hit[1];
    }
    if (correct !== null && correct >= options.length) correct = null;
    questions.push({ no: b.no, text: stem, options, correct });
  }

  if (questions.length === 0) notes.push("Sual tapılmadı. Suallar '1.' və ya '1)' ilə, variantlar isə 'A)' 'B)' ilə başlamalıdır.");
  if (questions.length && key.length === 0) notes.push("Cavab açarı tapılmadı. Düzgün cavabları aşağıda özünüz seçin.");
  const noOpts = questions.filter((q) => q.options.length < 2).length;
  if (noOpts) notes.push(`${noOpts} sualda variantlar tapılmadı. Onları əl ilə yazın və ya silin.`);
  const noAns = questions.filter((q) => q.options.length >= 2 && q.correct === null).length;
  if (noAns && key.length) notes.push(`${noAns} sualın düzgün cavabı tapılmadı. Onları aşağıda seçin.`);
  return { questions, notes };
}
