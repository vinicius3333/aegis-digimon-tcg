import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-029.js";

describe("EX6-029 Mastemon", () => {
  it("has Blast DNA Digivolve and plays a level 5 or lower Angel-family Digimon from hand or trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDNADigivolve",
    );
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [{ namesExact: ["Angewomon"] }, { namesExact: ["LadyDevimon"] }],
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      target: { filter: { levelComparison: { op: "lte", value: 5 } } },
    });
  });
  it("during DNA digivolving mandatorily places a Digimon into security and trashes until four remain", () => {
    const tail = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions.slice(1);
    expect(tail).toMatchObject([
      {
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        condition: { kind: "isDnaDigivolving" },
        from: ["battleArea"],
        toTop: false,
        ownerSecurity: true,
      },
      {
        kind: "SecurityManipulation",
        op: "trashTop",
        leaveCount: 4,
        condition: { kind: "isDnaDigivolving" },
      },
    ]);
    expect(tail?.[0]).not.toHaveProperty("optional");
    expect(tail?.[1]).not.toHaveProperty("optional");
  });
  it("routes the selected other Digimon to its owner's security bottom through the executable security primitive", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1];
    expect(action).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["battleArea"],
      toTop: false,
      ownerSecurity: true,
      source: { filter: { excludeSelf: true, kind: ["Digimon"] }, count: 1 },
    });
    expect(action).not.toHaveProperty("underFilter");
  });
  it("rejects DNA evolution with a wrong named material", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-022", as: "ange" },
          { card: "BT1-060", as: "wrongMate" },
        ],
        hand: [{ card: "EX6-029", as: "mast" }],
      },
    });
    await s.ready();
    const angeId = s.perm("ange").permanentId;
    const wrongMateId = s.perm("wrongMate").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [angeId, wrongMateId],
        instanceId: s.inst("mast").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("mast").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([angeId, wrongMateId]);
  });
  it("publicly plays Mastemon, pays seven memory, then free-plays an Angel-family Digimon from trash", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX6-029", as: "mast" }], trash: [{ card: "EX6-019", as: "angel" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mast").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("mast") !== undefined);
    expect(s.state.memory).toBe(3);
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId)).toBe(
      true,
    );
  });

  it("publicly DNA digivolves at Main for the printed cost 0 and places another Digimon in security while trimming the opponent to four", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-022", as: "ange" },
            { card: "EX6-053", as: "lady" },
            { card: "BT1-060", as: "other" },
          ],
          hand: [{ card: "EX6-029", as: "mast" }],
          security: ["BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("ange").permanentId, s.perm("lady").permanentId],
        instanceId: s.inst("mast").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("mast").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("mast").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(4);
  });

  it("Blast DNA digivolves from a public Counter window using Angewomon and LadyDevimon in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-022", as: "ange" },
            { card: "BT1-009", as: "other" },
          ],
          hand: [
            { card: "EX6-053", as: "lady" },
            { card: "EX6-029", as: "mast" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: Array(6).fill("BT1-010"),
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("mast").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("mast").instanceId,
        ) &&
        s.state.players[0]!.security.length === 3 &&
        s.state.players[1]!.security.length === 4,
    );
    const mast = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("mast").instanceId,
    );
    expect(mast?.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX6-022", "EX6-053"]));
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("other").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("attacker").instanceId);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  });

  it("continues the mandatory DNA security tail when the optional Angel play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-022", as: "ange" },
            { card: "EX6-053", as: "lady" },
            { card: "BT1-060", as: "other" },
          ],
          hand: [{ card: "EX6-029", as: "mast" }],
          trash: [{ card: "EX6-019", as: "angel" }],
          security: ["BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("ange").permanentId, s.perm("lady").permanentId],
        instanceId: s.inst("mast").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("mast").instanceId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("angel").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(4);
  });

  it("does not trash an opponent already at the four-card DNA security boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-022", as: "ange" },
            { card: "EX6-053", as: "lady" },
            { card: "BT1-060", as: "other" },
          ],
          hand: [{ card: "EX6-029", as: "mast" }],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("ange").permanentId, s.perm("lady").permanentId],
        instanceId: s.inst("mast").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-029"));
    expect(s.state.players[1]!.security).toHaveLength(4);
  });

  it("public normal play does not run the DNA-only security tail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "other" }],
          hand: [{ card: "EX6-029", as: "mast" }],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mast").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("mast").instanceId),
    );
    expect(s.state.players[1]!.security).toHaveLength(6);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("other").instanceId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
