import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-011.js";

describe("EX6-011 RagnaLoardmon", () => {
  it("has Blast DNA Digivolve, Raid, and Reboot", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDNADigivolve",
    );
    expect(
      compiled.effects
        ?.filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords ?? [])
        .map((keyword) => keyword.keyword),
    ).toEqual(expect.arrayContaining(["Raid", "Reboot"]));
  });
  it("trashes security, grants protection, and gates DNA de-digivolve/delete on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true } },
          grant: "immuneToOpponentEffects",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          amount: 1,
          stopAtLevel: 3,
          condition: { kind: "isDnaDigivolving" },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "isDnaDigivolving" },
        },
      ]);
    }
  });

  it("trashes the opponent's top security card when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-011", as: "ragna" }] },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ragna").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("ragna").instanceId),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("publicly performs Blast DNA Digivolve and resolves the DNA-only de-digivolve/delete tail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-010", as: "durandamon" },
            { card: "EX6-044", as: "brywe" },
          ],
          hand: [{ card: "EX6-011", as: "ragna" }],
        },
        1: {
          battleArea: [
            { card: "BT1-060", as: "stacked", under: ["BT1-009"] },
            { card: "BT1-009", as: "victim" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    const stackedPermanentId = s.perm("stacked").permanentId;
    const victimPermanentId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("durandamon").permanentId, s.perm("brywe").permanentId],
        instanceId: s.inst("ragna").instanceId,
        useBlastDigivolve: true,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const deletion = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deletion.decisionId,
        response: { kind: "chooseTargets", instanceIds: [victimPermanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ragna").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ragna").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(stackedPermanentId);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("victim").instanceId),
    ).toBe(false);
  });

  it("keeps its protection active after play even when the opponent has zero security", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-011", as: "ragna" }] },
        1: { battleArea: [{ card: "BT1-009", as: "source" }], security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ragna").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ragna").instanceId),
    );
    const ragna = s.state.players[0]!.battleArea[0]!;
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"], s.perm("source").permanentId);
    await advance(s.engine).verb.deletePermanent([ragna.permanentId], "byEffect");
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ragna").instanceId)).toBe(
      true,
    );
  });

  it("publicly exposes Raid and Reboot on RagnaLoardmon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-011", as: "ragna" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ragna"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ragna"), "Reboot")).toBe(true);
  });
});
