import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-051.js";
import "../index.js";

describe("BT21-051 Puppetmon", () => {
  it("models Blast Digivolve, Reboot, Blocker, and the shared On Play/When Digivolving sequence", () => {
    expect(
      compiled.effects.filter((effect) => effect.keywords?.length).map((effect) => effect.keywords?.[0]?.keyword),
    ).toEqual(["BlastDigivolve", "Reboot", "Blocker"]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Counter",
        isFromHand: true,
        keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([
        { kind: "DeDigivolve", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 2 },
        {
          kind: "Return",
          target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
          to: "deckBottom",
        },
      ]);
    }
  });

  it("keeps the alternate WG level-5 evolution requirement at cost 3", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["WG"], cost: 3, isAlternate: true }]);
  });

  it("de-digivolves one target by 2, then bottom-decks a different suspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-051", as: "puppetmon" }] },
        1: {
          battleArea: [
            {
              card: "BT21-045",
              as: "stacked",
              under: [
                { card: "BT21-042", as: "bottom" },
                { card: "BT21-044", as: "middle" },
              ],
            },
            { card: "BT1-012", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("stacked").topCard.instanceId, s.perm("suspended").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("puppetmon"));
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("suspended").instanceId));

    expect(s.perm("stacked").topCard.cardId).toBe("BT21-042");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT21-045", "BT21-044"]),
    );
    expect(s.state.players[1]!.deck.at(-1)!.cardId).toBe("BT1-012");
  });

  it("resolves the de-digivolve and bottom-deck sequence from a public play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-051", as: "puppetmon" }] },
        1: {
          battleArea: [
            { card: "BT21-045", as: "stacked", under: ["BT21-042", "BT21-044"] },
            { card: "BT1-012", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("stacked").topCard.instanceId, s.perm("suspended").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("puppetmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("suspended").instanceId));
    expect(s.perm("stacked").topCard.cardId).toBe("BT21-042");
    expect(s.state.memory).toBe(3);
  });

  it("refuses the alternate evolution from a level-5 without the WG trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-044", as: "nonWG" }], hand: [{ card: "BT21-051", as: "puppetmon" }] },
    });
    s.state.memory = 4;
    await s.ready();
    const handId = s.inst("puppetmon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonWG").permanentId,
        instanceId: handId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handId)).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("publicly keeps the de-digivolve result when no suspended target exists", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-051", as: "puppetmon" }] },
        1: { battleArea: [{ card: "BT21-045", as: "stacked", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("puppetmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea[0]?.topCard.cardId === "BT21-042");
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT21-042");
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("alternate-digivolves from a level-5 WG Digimon for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-050", as: "cherrymon" }],
        hand: [{ card: "BT21-051", as: "puppetmon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cherrymon").permanentId,
        instanceId: s.inst("puppetmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("cherrymon").topCard.instanceId === s.inst("puppetmon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("exposes Reboot and Blocker through the live keyword surface", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-051", as: "puppetmon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("puppetmon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("puppetmon"), "Blocker")).toBe(true);
  });
});
