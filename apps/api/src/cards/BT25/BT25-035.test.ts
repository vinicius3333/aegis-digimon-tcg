import { describe, expect, it } from "vitest";
import { compiled as BT25_035 } from "./BT25-035.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-035 Cougarmon", () => {
  it("requires exactly two bottom face-down cards under Tamers for the optional digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_035.effects?.find((entry) => entry.trigger === trigger);
      const digivolve = effect?.actions?.[1] as { kind?: string; optional?: boolean; cost?: Record<string, unknown> };
      expect(digivolve.kind).toBe("Digivolve");
      expect(digivolve.optional).toBe(true);
      expect(digivolve.cost).toMatchObject({
        kind: "trashBottomFaceDownUnderTamer",
        controller: "mine",
        count: 2,
      });
    }
  });

  it("keeps the -3000 DP effect independent of the cost payment", () => {
    for (const effect of BT25_035.effects?.filter((entry) =>
      ["OnPlay", "WhenDigivolving"].includes(String(entry.trigger)),
    ) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -3000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("naturally plays, reduces an opposing Digimon, and free-digivolves by aggregating two Tamer cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-035", as: "cougarmon" },
            { card: "BT25-041", as: "glowingDawn" },
          ],
          battleArea: [
            { card: "BT25-090", as: "firstTamer", under: [{ card: "BT1-001", faceUp: false }] },
            { card: "BT25-090", as: "secondTamer", under: [{ card: "BT1-002", faceUp: false }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-041"));

    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT25-041");
    expect(evolved?.topCard?.cardId).toBe("BT25-041");
    expect(s.state.memory).toBe(0);
    expect(s.perm("opponent").currentDP).toBe(4000);
    expect(s.perm("firstTamer").stack).toHaveLength(0);
    expect(s.perm("secondTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-002"]),
    );
  });

  it("does not free-digivolve when only one bottom face-down Tamer card is available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-035", as: "cougarmon" },
            { card: "BT25-041", as: "glowingDawn" },
          ],
          battleArea: [{ card: "BT25-090", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-035"));

    expect(s.perm("cougarmon").topCard?.cardId).toBe("BT25-035");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.perm("opponent").currentDP).toBe(4000);
  });

  it.each([
    ["wrong trait", { hand: [{ card: "BT1-010", as: "candidate" }], trash: [], battleArea: undefined }],
    ["illegal level", { hand: [{ card: "BT25-043", as: "candidate" }], trash: [], battleArea: undefined }],
    ["wrong zone", { hand: [], trash: [{ card: "BT25-041", as: "candidate" }], battleArea: undefined }],
    [
      "opponent stack",
      { hand: [], trash: [], battleArea: [{ card: "BT25-043", as: "opponent", dp: 7000, under: ["BT25-041"] }] },
    ],
  ])("does not spend two usable bottom face-down cards for a %s candidate", async (_label, candidateZone) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-035", as: "cougarmon" }, ...candidateZone.hand],
          trash: candidateZone.trash,
          battleArea: [
            {
              card: "BT25-090",
              as: "tamer",
              under: [
                { card: "BT1-001", faceUp: false },
                { card: "BT1-002", faceUp: false },
              ],
            },
          ],
        },
        1: { battleArea: candidateZone.battleArea ?? [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").currentDP === 4000);
    expect(s.perm("cougarmon").topCard?.cardId).toBe("BT25-035");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
    expect(s.perm("opponent").currentDP).toBe(4000);
  });

  it("keeps the -3000 DP result when the optional free digivolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-035", as: "cougarmon" },
            { card: "BT25-041", as: "candidate" },
          ],
          battleArea: [
            {
              card: "BT25-090",
              as: "tamer",
              under: [
                { card: "BT1-001", faceUp: false },
                { card: "BT1-002", faceUp: false },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-035"));
    expect(s.perm("cougarmon").topCard?.cardId).toBe("BT25-035");
    expect(s.perm("opponent").currentDP).toBe(4000);
    expect(s.perm("tamer").stack).toHaveLength(2);
  });

  it("deletes a Digimon reduced below zero only after the On Play effect finishes", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-035", as: "cougarmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 2000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("applies the -3000 DP reduction on When Digivolving while the free branch remains declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-032", as: "base" },
            {
              card: "BT25-090",
              as: "tamer",
              under: [
                { card: "BT1-001", faceUp: false },
                { card: "BT1-002", faceUp: false },
              ],
            },
          ],
          hand: [
            { card: "BT25-035", as: "cougarmon" },
            { card: "BT25-041", as: "candidate" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cougarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 4000);
    expect(s.perm("base").topCard?.cardId).toBe("BT25-035");
    expect(s.perm("opponent").currentDP).toBe(4000);
    expect(s.perm("tamer").stack).toHaveLength(2);
  });

  it("carries inherited Barrier through the public evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-058", as: "host", under: ["BT25-035"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("accepts inherited Barrier, pays one security, and completes public battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-058", as: "host", under: ["BT25-035"], dp: 7000, suspended: true }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 8000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("refuses inherited Barrier and deletes the legal Lv.5 host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-058", as: "host", under: ["BT25-035"], dp: 7000, suspended: true }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 8000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: false }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("cannot pay inherited Barrier when the security stack is empty", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-058", as: "host", under: ["BT25-035"], dp: 7000, suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 8000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
  });

  it("defers zero-DP deletion until the optional free-evolution decision resolves", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-035", as: "cougarmon" },
            { card: "BT25-041", as: "candidate" },
          ],
          battleArea: [
            {
              card: "BT25-090",
              as: "tamer",
              under: [
                { card: "BT1-001", as: "paidOne", faceUp: false },
                { card: "BT1-002", as: "paidTwo", faceUp: false },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.perm("opponent").currentDP).toBe(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("expires the -3000 DP effect when the real turn closes", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-035", as: "cougarmon" },
            { card: "AD1-001", as: "holdMain" },
          ],
          deck: Array(5).fill("BT1-001"),
          security: ["BT1-002"],
        },
        1: {
          deck: Array(5).fill("BT1-003"),
          security: ["BT1-004"],
          battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
      ok: true,
    });
    let observedReduction = 0;
    await settle(() => {
      observedReduction = s.state.players[1]!.battleArea[0]?.currentDP ?? observedReduction;
      return observedReduction === 4000;
    });
    expect(observedReduction).toBe(4000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("opponent").currentDP).toBe(7000);
  });

  it("uses the ordinary yellow Lv.3 evolution at its printed cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "yellowBase" }],
          hand: [{ card: "BT25-035", as: "cougarmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("cougarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowBase").topCard.cardId === "BT25-035");
    expect(s.state.memory).toBe(3);
    expect(s.perm("yellowBase").stack.map((card) => card.cardId)).toEqual(["BT25-032"]);
  });

  it("uses the Glowing Dawn alternate from an off-color green Lv.3 at cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-046", as: "greenBase" }],
          hand: [{ card: "BT25-035", as: "cougarmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenBase").permanentId,
        instanceId: s.inst("cougarmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenBase").topCard.cardId === "BT25-035");
    expect(s.state.memory).toBe(3);
    expect(s.perm("greenBase").stack.map((card) => card.cardId)).toEqual(["BT25-046"]);
  });

  it("rejects a wrong-color non-Glowing-Dawn Lv.3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redBase" }],
        hand: [{ card: "BT25-035", as: "cougarmon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("redBase").permanentId,
      instanceId: s.inst("cougarmon").instanceId,
    });
    expect(result).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redBase").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-035");
    expect(s.state.memory).toBe(5);
  });

  it.each([
    ["On Play", "one Tamer", true],
    ["On Play", "two Tamers", false],
    ["When Digivolving", "one Tamer", true],
    ["When Digivolving", "two Tamers", false],
  ] as const)(
    "trashes exactly two bottom face-down cards for %s free digivolution with %s",
    async (trigger, layout, sameTamer) => {
      const tamers = sameTamer
        ? [
            {
              card: "BT25-090",
              as: "firstTamer",
              under: [
                { card: "BT1-001", as: "paidOne", faceUp: false },
                { card: "BT1-002", as: "paidTwo", faceUp: false },
              ],
            },
          ]
        : [
            { card: "BT25-090", as: "firstTamer", under: [{ card: "BT1-001", as: "paidOne", faceUp: false }] },
            { card: "BT25-090", as: "secondTamer", under: [{ card: "BT1-002", as: "paidTwo", faceUp: false }] },
          ];
      const s = setupEngine(
        {
          0: {
            battleArea: trigger === "When Digivolving" ? [{ card: "BT25-032", as: "base" }, ...tamers] : tamers,
            hand: [
              { card: "BT25-035", as: "cougarmon" },
              { card: "BT25-041", as: "candidate" },
            ],
          },
          1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const result =
        trigger === "On Play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("cougarmon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-041"));
      const evolved = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT25-041");
      expect(evolved?.topCard?.cardId).toBe("BT25-041");
      expect(s.perm("opponent").currentDP).toBe(4000);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([s.inst("paidOne").instanceId, s.inst("paidTwo").instanceId]),
      );
      for (const tamer of sameTamer ? ["firstTamer"] : ["firstTamer", "secondTamer"]) {
        expect(s.perm(tamer).stack).toHaveLength(0);
      }
    },
  );
});
