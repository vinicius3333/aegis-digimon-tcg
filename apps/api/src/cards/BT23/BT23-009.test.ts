import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-009.js";

describe("BT23-009 Coachmon", () => {
  it("matches every catalog field and carries both executable faces", () => {
    expect(getCardDefinition("BT23-009")).toMatchObject({
      cardId: "BT23-009",
      nameEn: "Coachmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      attributes: ["Game"],
      types: ["Training", "Leviathan"],
      effectText:
        "[Your Turn] [Once Per Turn] When this Digimon gets linked, 1 of your Digimon gets +4000 DP for the turn.",
      linkDp: 3000,
      linkEffect: "[End of Your Turn] [Once Per Turn] This Digimon may attack a player.",
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 2",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenLinked",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "ModifyDP",
                  target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
                  amount: 4000,
                  duration: "forTheTurn",
                },
              ],
            },
          ],
        },
        {
          trigger: "EndOfYourTurn",
          isLinked: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Attack",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              attackPlayer: true,
              drainTimingWindowDuringAttack: true,
              optional: true,
            },
          ],
        },
      ],
      linkRequirement: [{ traits: ["Appmon"], cost: 2 }],
      coverage: "full",
      residual: [],
    });
  });

  it("gets linked, then gives exactly one friendly Digimon +4000 for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-009", as: "coach" },
            { card: "BT1-009", as: "beneficiary" },
          ],
          hand: [{ card: "BT23-007", as: "link" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const coachDp = s.perm("coach").currentDP;
    const beneficiaryDp = s.perm("beneficiary").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("coach").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("coach").currentDP === coachDp + 2000 + 4000);

    expect(s.perm("coach").currentDP).toBe(coachDp + 2000 + 4000);
    expect(s.perm("beneficiary").currentDP).toBe(beneficiaryDp);
    expect(s.state.memory).toBe(4);
  });

  it("evolves legally from a red level-3 for 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT23-009", as: "coach" }] },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("coach").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("coach").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("base").instanceId);
  });

  it("links to an Appmon for 2, contributes 3000 DP, and grants an optional end-turn player attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-009", as: "host" }],
          hand: [{ card: "BT23-009", as: "coach" }],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("coach").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === s.inst("coach").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000 + 4000);

    await advance(s.engine).runTurn(0);
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("host")));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may refuse the linked end-turn attack without suspending or checking security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", linked: ["BT23-009"], as: "host" }] },
        1: { security: 1 },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).runTurn(0);
    await settle();

    expect(s.perm("host").isSuspended).toBe(false);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("host"))).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("rejects linking to a non-Appmon without spending memory or moving Coachmon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "BT23-009", as: "coach" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("coach").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("coach").instanceId);
    expect(s.perm("host").linked).toHaveLength(0);
  });

  it("trashes the old link and refreshes DP after same-turn link replacement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-009", as: "host", linked: [{ card: "BT23-007", as: "first" }] }],
          hand: [{ card: "BT23-007", as: "second" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("second").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").linked).toHaveLength(1);
    expect(s.perm("host").currentDP).toBe(baseDp + 6000);
    expect(s.perm("host").linked[0]!.instanceId).toBe(s.inst("second").instanceId);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("first").instanceId)).toBe(true);
  });

  it("does not fire Coachmon's link trigger when a non-Coachmon Appmon is linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-009", as: "host" },
            { card: "BT21-009", as: "other" },
          ],
          hand: [{ card: "BT23-007", as: "link" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const hostBase = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("other").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").currentDP).toBe(hostBase);
  });

  it("resets the link trigger on the next own turn through the production loop", async () => {
    const deck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"];
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-009", as: "host" }],
        hand: [
          { card: "BT23-007", as: "first" },
          { card: "BT23-007", as: "second" },
        ],
        deck,
      },
      1: { deck, security: ["BT1-001", "BT1-002", "BT1-003"] },
    });
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("first").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === baseDp + 6000);
    expect(s.state.memory).toBe(9);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("second").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === baseDp + 6000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refreshes replaced linked keywords and DP immediately", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-007", as: "host" }],
          hand: [
            { card: "BT23-007", as: "old" },
            { card: "BT24-053", as: "new" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("old").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    await settle(() => s.perm("host").keywords.includes("Piercing"), 2000);
    const before = s.perm("host").currentDP;
    expect(s.perm("host").keywords.includes("Piercing")).toBe(true);
    expect(s.perm("host").keywords.includes("Blocker")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("new").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("host").linked.length === 1 && s.perm("host").linked[0]!.instanceId === s.inst("new").instanceId,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("old").instanceId)).toBe(true);
    expect(s.perm("host").keywords.includes("Piercing")).toBe(false);
    expect(s.perm("host").keywords.includes("Blocker")).toBe(true);
    expect(s.perm("host").currentDP).toBe(
      before - getCardDefinition("BT23-007")!.linkDp! + getCardDefinition("BT24-053")!.linkDp!,
    );
  });
});
