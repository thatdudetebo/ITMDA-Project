// Turns the model's free text into structured question/answer pairs.
// Pure functions with no React Native imports, so they can be tested off-device.

export interface QAPair {
  question: string;
  answer: string;
}

const PREFIX = String.raw`^\s*(?:\d+[.)]\s*)?(?:\*\*)?`;
const TAIL = String.raw`\s*(?:\*\*)?\s*`;
// "Q:" and "A:" need a colon so text like "A-level ..." is not mistaken for a marker.
// The full words also accept "." and "-".
const marker = (word: string, letter: string) =>
  new RegExp(
    `${PREFIX}(?:${word}\\s*\\d*${TAIL}[:.-]|${letter}\\s*\\d*${TAIL}:)\\s*(?:\\*\\*)?\\s*`,
    'i',
  );
const QUESTION_LINE = marker('Question', 'Q');
const ANSWER_LINE = marker('Answer', 'A');

// An "A:" marker on the same line as its question, right after the question's end punctuation.
const INLINE_ANSWER = /[?.!)"'*]\s+(?=(?:\*\*)?(?:Answer|A)\s*\d*\s*(?:\*\*)?\s*:\s)/i;

/** Removes leftover bold markers and surrounding whitespace. */
function clean(text: string): string {
  return text.replace(/\*\*/g, '').trim();
}

/**
 * Parses "Q: ... / A: ..." blocks. Tolerant of numbering, bold markers and "Question:/Answer:".
 * Lines that continue a question or answer are appended to it. Pairs missing either half are
 * dropped, and text with no markers returns [].
 */
export function parseQAPairs(text: string): QAPair[] {
  const pairs: QAPair[] = [];
  let question: string | null = null;
  let answer: string | null = null;

  const flush = () => {
    if (question !== null && answer !== null) {
      const q = clean(question);
      const a = clean(answer);
      if (q && a) pairs.push({ question: q, answer: a });
    }
    question = null;
    answer = null;
  };

  const lines: string[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    // A model sometimes writes "Q: ... A: ..." on one line. Split once, only on a question line,
    // so an answer that happens to contain "A:" is left alone.
    const q = QUESTION_LINE.exec(raw);
    const inline = q ? INLINE_ANSWER.exec(raw.slice(q[0].length)) : null;
    if (q && inline) {
      const at = q[0].length + inline.index + 1;
      lines.push(raw.slice(0, at), raw.slice(at).trimStart());
    } else {
      lines.push(raw);
    }
  }

  for (const line of lines) {
    const q = QUESTION_LINE.exec(line);
    const a = ANSWER_LINE.exec(line);
    if (q && !a) {
      flush();
      question = line.slice(q[0].length);
    } else if (a && question !== null && answer === null) {
      answer = line.slice(a[0].length);
    } else if (answer !== null) {
      answer += `\n${line}`;
    } else if (question !== null) {
      question += ` ${line}`;
    }
  }
  flush();
  return pairs;
}
