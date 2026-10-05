import { expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

it.each(["BT14-009", "BT9-033", "BT9-047"])(
  "%s also blocks Jesmon tokens through the shared play prohibition (Discord 1556299783898005544)",
  async (prohibitor) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-013", as: "jesmon" }] },
        1: { battleArea: [prohibitor], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "attackEnded" || e.kind === "alliancePrompt"));
    const allianceResponse = s.events.some((e) => e.kind === "alliancePrompt")
      ? s.engine.applyIntent(0, { type: "respondAlliance" })
      : { ok: true };
    expect(allianceResponse).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "attackEnded") && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT23-013"]);
  },
);
