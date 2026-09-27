import { expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("start turn settles opposing derived play before an older turn-player memory effect", async () => {
  const s = setupEngine(
    {
      0: { battleArea: ["BT11-012", "BT11-094"], deck: ["BT1-009", "BT1-009"] },
      1: {
        battleArea: [{ card: "EX10-058", under: ["BT1-009", "BT1-009"] }],
        trash: ["BT4-079"],
        deck: ["BT1-009", "BT1-009"],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, preferTriggerKeys: ["BT11-012"] },
  );
  await s.ready();
  const turn = s.engine.runOneTurn();
  try {
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(
      s.events.flatMap((e) =>
        e.kind === "effectTriggered" && ["BT11-012", "BT11-094", "EX10-058", "BT4-079"].includes(e.sourceCardId)
          ? [e.sourceCardId]
          : [],
      ),
    ).toEqual(["BT11-012", "EX10-058", "BT4-079", "BT11-094"]);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await turn;
  }
});

it("end opponent turn resolves the turn player's deletion before the cost payer's deletion", async () => {
  const s = setupEngine(
    {
      0: { battleArea: ["BT2-070"], deck: ["BT1-009", "BT1-009"] },
      1: { battleArea: ["BT16-010"], trash: ["BT14-071"], deck: ["BT1-009", "BT1-009"] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  await s.ready();
  const turn = s.engine.runOneTurn();
  try {
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle();
    expect(
      s.events.flatMap((e) =>
        e.kind === "effectTriggered" && ["BT2-070", "BT16-010"].includes(e.sourceCardId)
          ? [`${e.sourceCardId}:${e.timing}`]
          : [],
      ),
    ).toEqual(["BT16-010:OnEndTurn", "BT2-070:OnDestroyedAnyone", "BT16-010:OnDestroyedAnyone"]);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
