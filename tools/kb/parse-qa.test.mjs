import assert from "node:assert/strict";
import test from "node:test";
import { parseQa } from "./lib/parse-qa.mjs";

test("parseQa excludes a related card's Q&A category", () => {
  const html = `
    <dt class="qa_category"><span>522901</span>LM-029 Yellow Scramble</dt>
    <dl class="questions"><dt>Q4043</dt><dd>Yellow question<span>May. 24, 2024 Updated</span></dd></dl>
    <dl class="answer"><dt>A4043</dt><dd>Yellow answer</dd></dl>
    <div class="relation"></div>
    <dt class="qa_category"><span>522026</span>EX8-037 Sakuyamon (X Antibody)</dt>
    <dl class="questions"><dt>Q4737</dt><dd>Related question<span>May. 8, 2026 Updated</span></dd></dl>
    <dl class="answer"><dt>A4737</dt><dd>Related answer</dd></dl>
    <div class="relation"><a href="/cardlist/?card_no=LM-029">LM-029</a></div>
  `;

  assert.deepEqual(parseQa(html, "LM-029"), [
    {
      qno: "Q4043",
      question: "Yellow question",
      answer: "Yellow answer",
      date: "2024-05-24",
      related: [],
    },
  ]);
});
