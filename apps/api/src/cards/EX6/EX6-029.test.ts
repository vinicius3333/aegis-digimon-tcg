import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-029.js";

describe("EX6-029 Mastemon", () => {
  it("has Blast DNA Digivolve and plays a level 5 or lower Angel-family Digimon from hand or trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDNADigivolve",
    );
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
  it("publicly plays an Angel-family Digimon from trash on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-029", as: "mast" }], trash: [{ card: "EX6-019", as: "angel" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mast"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId)).toBe(
      true,
    );
  });

  it("publicly performs Blast DNA Digivolve and places another Digimon in security while trimming the opponent to four", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-022", as: "ange" },
            { card: "EX6-053", as: "lady" },
            { card: "BT1-060", as: "other" },
          ],
          hand: [{ card: "EX6-029", as: "mast" }],
          security: ["BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"] },
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
        useBlastDigivolve: true,
      } as never),
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
          security: ["BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"] },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("ange").permanentId, s.perm("lady").permanentId],
        instanceId: s.inst("mast").instanceId,
        useBlastDigivolve: true,
      } as never),
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
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"] },
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
        useBlastDigivolve: true,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-029"));
    expect(s.state.players[1]!.security).toHaveLength(4);
  });

  it("does not run the security tail when played without DNA Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-029", as: "mast" }] },
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mast"));
    expect(s.state.players[1]!.security).toHaveLength(6);
  });
});
