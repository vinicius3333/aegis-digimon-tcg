import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-05 GeoGreymon", () => {
  it("plays one DATA SQUAD Tamer without cost when the controller has at most one Tamer", () => {
    const compiled = registeredCompiledCards.get("ST24-05") ?? getCompiledCard("ST24-05")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: {
          count: 1,
          filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
        },
        condition: {
          kind: "youHave",
          filter: { controllerDefault: "mine", kind: ["Tamer"], countMax: 1 },
        },
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });

  it("plays the Tamer with none in play and refuses the effect with two in play", async () => {
    const allowed = setupEngine(
      {
        0: {
          hand: [
            { card: "ST24-05", as: "geoGreymon" },
            { card: "ST24-13", as: "allowedTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    allowed.state.memory = 10;
    await allowed.ready();
    expect(
      allowed.engine.applyIntent(0, { type: "playCard", instanceId: allowed.inst("geoGreymon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      allowed.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === allowed.inst("allowedTamer").instanceId,
      ),
    );

    const blocked = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-13", as: "firstTamer" },
            { card: "ST24-14", as: "secondTamer" },
          ],
          hand: [
            { card: "ST24-05", as: "geoGreymon" },
            { card: "ST24-13", as: "blockedTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    blocked.state.memory = 10;
    await blocked.ready();
    expect(
      blocked.engine.applyIntent(0, { type: "playCard", instanceId: blocked.inst("geoGreymon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      blocked.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === blocked.inst("geoGreymon").instanceId,
      ),
    );
    await settle(() => false, 100);

    expect(blocked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      blocked.inst("blockedTamer").instanceId,
    );
  });
});
