import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-076.js";

describe("BT11-076 Ignitemon", () => {
  it("maps catalog facts and both printed effects to IR", () => {
    expect(getCardDefinition("BT11-076")).toMatchObject({
      cardId: "BT11-076", colors: ["Purple"], level: 3, playCost: 4, dp: 2000, types: ["Reptile Man", "Xros Heart"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenAttacking", actions: [{ kind: "Delete" }] },
      { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }] },
    ]);
  });

  it("digivolves for 0 from a level 2 with the Xros Heart trait", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT10-005", as: "xrosHeartEgg" },
        hand: [{ card: "BT11-076", as: "ignitemon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("xrosHeartEgg").permanentId,
        instanceId: s.inst("ignitemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("xrosHeartEgg").topCard.cardId === "BT11-076");

    expect(s.state.memory).toBe(3);
    expect(s.perm("xrosHeartEgg").topCard.cardId).toBe("BT11-076");
  });

  it("deletes another own Digimon and only an unsuspended opponent of no greater level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-076", as: "ignitemon" },
            { card: "BT8-041", as: "sacrifice" },
          ],
        },
        1: {
          security: ["BT1-009"],
          battleArea: [
            { card: "BT8-023", as: "eligible" },
            { card: "BT8-032", as: "level-six" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const sacrificeId = s.perm("sacrifice").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ignitemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sacrificeId) === false);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT8-032"]);
  });

  it("does not delete an opponent above the deleted Digimon's level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-076", as: "ignitemon" },
            { card: "BT8-023", as: "levelThree" },
          ],
        },
        1: { battleArea: [{ card: "BT8-032", as: "levelSix" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ignitemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("gains memory only when its host is played by an effect and only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-071", as: "host", under: ["BT11-076"] }] },
    });
    s.state.memory = 0;
    await s.ready();
    const payload = { subjectPermanentId: s.perm("host").permanentId };

    await advance(s.engine).fireSubTrigger("whenPlayed", payload);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).fireSubTrigger("whenPlayed", { ...payload, playedByEffect: true });
    await advance(s.engine).fireSubTrigger("whenPlayed", { ...payload, playedByEffect: true });

    expect(s.state.memory).toBe(1);
  });
});
