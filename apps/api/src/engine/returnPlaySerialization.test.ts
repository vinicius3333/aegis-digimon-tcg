import { expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/EX6/EX6-031.js";

it("serializes a wouldBeReturned stack-play chain before returnToHand resolves", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "EX6-031", as: "shaka", under: ["EX6-025", "EX6-023"] }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();

  await advance(s.engine).verb.returnToHand([s.perm("shaka").topCard!.instanceId]);
  await settle(() => s.state.players[0]!.battleArea.length === 2);

  expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
    expect.arrayContaining(["EX6-025", "EX6-023"]),
  );
  expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX6-031");
});
