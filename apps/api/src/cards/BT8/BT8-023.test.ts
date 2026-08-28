import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-023.js";

describe("BT8-023 Submarimon", () => {
  it("trashes a bottom source, then gives a source-less Digimon -3000 DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-027", as: "base" }], hand: [{ card: "BT8-023", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-009", under: [{ card: "BT1-001", as: "bottom" }], as: "withSource" },
            { card: "BT1-015", as: "sourceLess" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("withSource").permanentId, s.perm("sourceLess").permanentId);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sourceLess").currentDP === 1000);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId)).toBe(true);
  });

  it("still gives -3000 DP when no opposing Digimon has a digivolution card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-027", as: "base" }], hand: [{ card: "BT8-023", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-015", as: "sourceLess" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("sourceLess").currentDP).toBe(s.perm("sourceLess").baseDP - 3000);
  });

  it("digivolves from Armadillomon for 2 and can Armor Purge after battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-033", as: "armadillomon" }],
          hand: [{ card: "BT8-023", as: "submarimon" }],
        },
        1: { battleArea: [{ card: "BT8-041", as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const armadillomonId = s.perm("armadillomon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("armadillomon").permanentId,
        instanceId: s.inst("submarimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("armadillomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("armadillomon").topCard.instanceId === armadillomonId);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("submarimon").instanceId)).toBe(true);
  });
});
