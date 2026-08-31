import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-062.js";
import "./index.js";

describe("BT17-062 Dorumon", () => {
  it("requires Kosuke underneath and an opposing level-6-or-higher Digimon", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenAttacking")?.actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      costOverride: 4,
      ignoreRequirements: true,
      condition: {
        kind: "allOf",
        conditions: [
          {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "name" }] },
          },
          {
            kind: "opponentHas",
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
          },
        ],
      },
      into: { nameOrTrait: [{ tokens: ["Dorugoramon"], match: "name" }] },
    });
  });

  it("retains Reboot as its inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
    ]);
  });

  it("digivolves into Dorugoramon for 4 while attacking with both conditions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", under: ["BT16-087"], as: "dorumon" }],
          hand: [{ card: "BT17-073", as: "dorugoramon" }],
        },
        1: {
          battleArea: [{ card: "BT17-070", as: "levelSix" }],
          security: 1,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const dorugoramonId = s.inst("dorugoramon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dorumon").topCard?.instanceId === dorugoramonId);

    expect(s.state.memory).toBe(0);
  });

  it("does not offer the attack evolution without an opposing level 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", under: ["BT16-087"], as: "dorumon" }],
          hand: [{ card: "BT17-073", as: "dorugoramon" }],
        },
        1: { battleArea: [{ card: "BT17-025", as: "levelFive" }], security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("dorumon").topCard?.cardId).toBe("BT17-062");
    expect(s.state.memory).toBe(4);
  });

  it("does not offer the attack evolution without Kosuke in the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", as: "dorumon" }],
          hand: [{ card: "BT17-073", as: "dorugoramon" }],
        },
        1: { battleArea: [{ card: "BT17-070", as: "levelSix" }], security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("dorumon").topCard?.cardId).toBe("BT17-062");
    expect(s.state.memory).toBe(4);
  });

  it("grants inherited Reboot to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-065", under: ["BT17-062"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
