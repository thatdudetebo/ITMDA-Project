// Turns the model's free text into structured question/answer pairs.
// Pure functions with no React Native imports, so they can be tested off-device.
// Deliverable 3 reference: section 6.2, inference layer

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

// What a model writes when it copies the format instruction instead of real content: "question",
// "Question 1", "your answer here", "<the answer>", "...".
const PLACEHOLDER =
  /^(?:(?:your|the|a|an)\s+)?(?:question|answer)(?:\s+(?:here|text|goes here|\d+))?$/;

/**
 * Lower case with punctuation and spacing collapsed, for comparing two texts. Letters, digits and
 * symbols that carry meaning (+ = % # & @ and maths or currency signs) are kept, so "C++" and "C#"
 * or "2+3" and "2-3" stay different and an answer such as "∞" is not mistaken for nothing.
 */
function squash(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{S}#%&@]+/gu, ' ')
    .trim();
}

/** True for template leftovers such as "question", "<the answer>", "Question?" or "...". */
function isPlaceholder(text: string): boolean {
  // Angle brackets and backticks wrap template words ("<the answer>") but squash() keeps them.
  const bare = squash(text.replace(/[<>`]+/g, ' '));
  return bare === '' || PLACEHOLDER.test(bare);
}

/** Removes leftover bold markers and surrounding whitespace. */
function clean(text: string): string {
  return text.replace(/\*\*/g, '').trim();
}

/**
 * Parses "Q: ... / A: ..." blocks. Tolerant of numbering, bold markers and "Question:/Answer:".
 * Lines that continue a question or answer are appended to it. Pairs missing either half are
 * dropped, and text with no markers returns []. Template leftovers ("Q: question"), pairs whose
 * question equals the answer, and repeated questions are dropped too.
 */
export function parseQAPairs(text: string): QAPair[] {
  const pairs: QAPair[] = [];
  let question: string | null = null;
  let answer: string | null = null;

  const flush = () => {
    if (question !== null && answer !== null) {
      // Models often number questions after the marker, e.g. "Question: 1. What is ...".
      const q = clean(question).replace(/^\d+[.)]\s*/, '');
      const a = clean(answer);
      // Real content only: a model that copies the template ("Q: question") or repeats a sentence
      // as both question and answer has not produced a usable pair.
      const copied = squash(q) === squash(a);
      const repeated = pairs.some((p) => squash(p.question) === squash(q));
      if (q && a && !isPlaceholder(q) && !isPlaceholder(a) && !copied && !repeated) {
        pairs.push({ question: q, answer: a });
      }
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

/**
 * True when the text ends on a question that has no answer yet, which is what a model that was cut
 * off while starting its next item leaves behind. parseQAPairs drops that unfinished question, so
 * the pairs it did return are all complete.
 */
export function endsWithDanglingQuestion(text: string): boolean {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  const last = lines[lines.length - 1];
  if (last === undefined) return false;
  const marker = QUESTION_LINE.exec(last);
  // A question with its answer on the same line is finished.
  return marker !== null && !INLINE_ANSWER.test(last.slice(marker[0].length));
}
