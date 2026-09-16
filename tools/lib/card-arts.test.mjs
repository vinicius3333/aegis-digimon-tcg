import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceCardArts } from "./card-arts.mjs";

test("imports only declared printings for the canonical card, deduplicated and sorted", () => {
  assert.deepEqual(
    sourceCardArts({
      cardNumber: "BT1-010",
      AAs: [
        { id: "BT1-010_P2", note: "Memorial collection" },
        { id: "BT1-011_P1" },
        { id: "BT1-010_P1-J" },
        { id: "BT1-010_P2" },
        { id: "BT1-010_P1", type: "Alternative Art" },
      ],
    }),
    [
      { artId: "BT1-010_P1", imageId: "BT1-010_P1", label: "Alternative Art" },
      { artId: "BT1-010_P2", imageId: "BT1-010_P2", label: "Memorial collection" },
    ],
  );
  assert.deepEqual(sourceCardArts({ cardNumber: "BT1-010" }), []);
});
