import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-008.js";

describe("BT22-008 Agumon", () => {
  it("requires this Digimon plus another owned Digimon for the inherited End of Your Turn DNA digivolution", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      target: { filter: { zone: "trash", controller: "mine" } },
    });

    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(inherited).toMatchObject({ isInherited: true });
    const dna = inherited?.actions[0] as any;
    expect(dna).toMatchObject({ kind: "DnaDigivolve", payCost: true, optional: true });
    expect(dna.materials).toEqual([
      { filter: { isSelfRef: true }, count: 1, zone: "battleArea" },
      { filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1, zone: "battleArea" },
    ]);
    expect(dna.into).toEqual({
      filter: { controller: "mine", kind: ["Digimon"], zone: "hand", hasDnaDigivolutionRequirement: true },
      count: 1,
    });
  });

  it("optionally returns exactly one Greymon/Garurumon/Omnimon-name Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-008", as: "agumon" }],
          trash: [
            { card: "BT1-025", as: "greymon" },
            { card: "BT1-010", as: "nonmatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("agumon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("greymon").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("nonmatch").instanceId]);
  });

  it("allows the player to refuse the On Play return", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-008", as: "agumon" }],
        trash: [{ card: "BT1-025", as: "greymon" }],
      },
    });
    await s.ready();

    const pending = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("agumon"));
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"), 60);
    const prompt = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await pending;

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("greymon").instanceId]);
  });

  it("DNA digivolves its inherited red level-4 host with another owned material at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-009", under: ["BT22-008"], as: "host" },
            { card: "BT1-051", as: "otherMaterial" },
          ],
          hand: [{ card: "BT16-012", as: "dna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-012"));

    const dna = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-012");
    expect(dna).toBeDefined();
    expect(dna?.stack.some((card) => card.cardId === "BT22-008")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
