import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBanlist } from "./lib/parse-banlist.mjs";

test("regional BT8 restrictions do not inherit the prior April 2021 date", () => {
  const parsed = parseBanlist(`
    <h4>Effective on April 1, 2021</h4><h5>Restricted Cards (1)</h5>
    <dd>BT2-047<br>Argomon</dd>
    <h4>Effective at the time of BT-08 release in your region.</h4>
    <h5>Restricted Cards (1)</h5>
    <dd>BT6-015<br>SaviorHuckmon</dd><dd>BT7-072<br>Eyesmon</dd>
  `);
  assert.equal(parsed.events[0].effectiveDate, "2021-04-01");
  assert.equal(parsed.events[1].effectiveDate, "2022-05-13");
  assert.equal(parsed.events[2].effectiveDate, "2022-05-13");
});

test("multiple cards printed in one announcement entry are all restricted", () => {
  const parsed = parseBanlist(`
    <h4>Effective on March 28, 2025</h4><h5>Restricted Cards (1)</h5>
    <dd>P-029 Agunimon<br>P-030 Lobomon</dd>
  `);
  assert.equal(parsed.current["P-029"].count, 1);
  assert.equal(parsed.current["P-030"].count, 1);
  assert.equal(parsed.events[0].name, "Agunimon");
  assert.equal(parsed.events[1].name, "Lobomon");
});
