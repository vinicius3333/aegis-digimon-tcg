import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-043.js";

describe("EX8-043", () => {
  it("may suspend either player's Digimon, then de-digivolves an opposing Digimon if this Digimon is suspended", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Suspend", optional: true });
    expect(actions[1]).toMatchObject({ kind: "DeDigivolve", amount: 1, condition: { kind: "selfIsSuspended" } });
  });
  it("protects itself from opponent returns and de-digivolution while suspended", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[2]).toMatchObject({ kind: "Restrict", restriction: "beReturned", byOpponentEffectsOnly: true, duration: "untilOpponentTurnEnd" });
    expect(actions[3]).toMatchObject({ kind: "Restrict", restriction: "cantBeDeDigivolved", duration: "untilOpponentTurnEnd" });
  });

  it("suspends a legal Digimon through On Play and resolves the optional effect", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine({
      0: { hand: [{ card: "EX8-043", as: "metal" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
    preferInstanceIds.push(s.perm("opponent").permanentId);
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((p) => p.topCard?.cardId === "EX8-043") && s.state.players[1].battleArea[0]?.isSuspended === true);

    expect(s.state.players[1].battleArea[0]?.isSuspended).toBe(true);
  });
});
