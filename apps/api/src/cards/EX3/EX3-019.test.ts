import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT12/BT12-028.js";
import "../BT4/BT4-011.js";
import "./EX3-019.js";

function opponentTurn<T extends ReturnType<typeof setupEngine>>(s: T, memory: number): T {
  s.state.turnSeat = 1;
  s.state.memory = -memory;
  return s;
}

describe("EX3-019 Paledramon", () => {
  it("matches its official identity and both printed effects", () => {
    expect(getCardDefinition("EX3-019")).toMatchObject({
      nameEn: "Paledramon",
      colors: ["Blue"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Dragon"],
      imageId: "EX3-019",
      effectText: "[When Digivolving] Trash any digivolution card of 1 of your opponent's Digimon.",
      inheritedEffectText:
        "[Opponent's Turn] When an opponent's Digimon with no digivolution cards would digivolve, increase the digivolution cost by 1.",
    });
  });

  it("chooses a source-bearing opponent Digimon and then any exact card in its stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "base" }],
        hand: [{ card: "EX3-019", as: "paledramon" }],
        deck: ["BT1-030"],
      },
      1: {
        battleArea: [
          {
            card: "BT1-033",
            under: [
              { card: "BT1-003", as: "bottom" },
              { card: "BT1-029", as: "top" },
            ],
            as: "withSources",
          },
          { card: "BT1-032", under: ["BT1-003"], as: "otherWithSource" },
          { card: "BT1-032", as: "empty" },
        ],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paledramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const hostDecision = s.state.pendingDecision!;
    const hostPayload = JSON.parse(hostDecision.payloadJson) as {
      candidateInstanceIds: string[];
      visibleInstanceIds: string[];
    };
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-019",
      options: {
        candidateInstanceIds: expect.arrayContaining([
          s.perm("withSources").permanentId,
          s.perm("otherWithSource").permanentId,
        ]),
        visibleInstanceIds: expect.arrayContaining([
          s.perm("withSources").permanentId,
          s.perm("otherWithSource").permanentId,
        ]),
      },
    });
    expect(hostPayload.candidateInstanceIds).toContain(s.perm("withSources").permanentId);
    expect(hostPayload.candidateInstanceIds).toContain(s.perm("otherWithSource").permanentId);
    expect(hostPayload.candidateInstanceIds).not.toContain(s.perm("empty").permanentId);
    expect(hostPayload.visibleInstanceIds).toEqual(
      expect.arrayContaining([s.perm("withSources").permanentId, s.perm("otherWithSource").permanentId]),
    );
    expect(hostPayload.visibleInstanceIds).not.toContain(s.perm("empty").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hostDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("withSources").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const sourceDecision = s.state.pendingDecision!;
    const sourcePayload = JSON.parse(sourceDecision.payloadJson) as {
      candidateInstanceIds: string[];
      visibleInstanceIds: string[];
    };
    const selectableSources = [s.inst("bottom").instanceId, s.inst("top").instanceId];
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-019",
      options: {
        candidateInstanceIds: expect.arrayContaining(selectableSources),
        visibleInstanceIds: expect.arrayContaining(selectableSources),
        min: 1,
        max: 1,
      },
    });
    expect(sourcePayload.candidateInstanceIds).toEqual(expect.arrayContaining(selectableSources));
    expect(sourcePayload.visibleInstanceIds).toEqual(expect.arrayContaining(selectableSources));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: sourceDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("bottom").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("bottom").instanceId));

    expect(s.perm("withSources").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("top").instanceId);
    expect(s.perm("withSources").stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("bottom").instanceId);
  });

  it("opens no target decision when no opponent Digimon has digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-029", as: "base" }], hand: [{ card: "EX3-019", as: "paledramon" }] },
      1: { battleArea: [{ card: "BT1-032", as: "empty" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paledramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-019");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("empty").stack).toHaveLength(0);
  });

  it("Q3386 stacks two inherited copies in the same stack and Q3391 preserves the hand when the result is unaffordable", async () => {
    const s = opponentTurn(
      setupEngine({
        0: {
          battleArea: [{ card: "EX3-021", under: ["EX3-019", "EX3-019"], as: "dragon" }],
        },
        1: { battleArea: [{ card: "BT1-029", as: "base" }], hand: [{ card: "BT1-032", as: "evolver" }] },
      }),
      7,
    );
    await s.ready();

    const evolverId = s.inst("evolver").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: evolverId,
      }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-029");
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(evolverId);
  });

  it("does not increase the cost when the ordinary base already has a source", async () => {
    const s = opponentTurn(
      setupEngine({
        0: { battleArea: [{ card: "EX3-021", under: ["EX3-019"], as: "host" }] },
        1: {
          battleArea: [{ card: "BT1-029", under: ["BT1-003"], as: "base" }],
          hand: [{ card: "BT1-032", as: "evolver" }],
          deck: ["BT1-030"],
        },
      }),
      2,
    );
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-032");
    expect(s.state.memory).toBe(-4);
  });

  it("Q3387/Q3388 increases one DNA digivolution only once if either material has no sources", async () => {
    for (const secondHasSource of [false, true]) {
      const s = opponentTurn(
        setupEngine({
          0: { battleArea: [{ card: "EX3-021", under: ["EX3-019"], as: "dragonHost" }] },
          1: {
            battleArea: [
              { card: "BT12-022", as: "exveemon" },
              { card: "BT12-050", under: secondHasSource ? ["BT1-003"] : [], as: "stingmon" },
            ],
            hand: [{ card: "BT12-028", as: "paildramon" }],
            deck: ["BT1-030"],
          },
        }),
        1,
      );
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "dnaDigivolve",
          materialPermanentIds: [s.perm("exveemon").permanentId, s.perm("stingmon").permanentId],
          instanceId: s.inst("paildramon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-028"));
      expect(s.state.memory).toBe(-2);
    }
  });

  it("Q3389/Q3390 increases a Hybrid evolution from an empty Tamer but not one with a card under it", async () => {
    for (const hasSource of [false, true]) {
      const s = opponentTurn(
        setupEngine({
          0: { battleArea: [{ card: "EX3-021", under: ["EX3-019"], as: "host" }] },
          1: {
            battleArea: [{ card: "BT1-085", under: hasSource ? ["BT1-003"] : [], as: "tamer" }],
            hand: [{ card: "BT4-011", as: "agunimon" }],
            deck: ["BT1-030"],
          },
        }),
        hasSource ? 2 : 3,
      );
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("tamer").permanentId,
          instanceId: s.inst("agunimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard.cardId === "BT4-011");
      expect(s.state.memory).toBe(hasSource ? -4 : -6);
    }
  });
});
