import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT25-096.js";
import { cite } from "../../engine/conformance/_kb.js";

describe("BT25-096 Mirage Beast Knight", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0034",
      "Bracket-only Gaomon-line and Thomas references require exact names",
      "c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2",
    );
  });
  it("binds both required materials and 'that Digimon' evolution to one Gaomon", () => {
    const block = compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0];
    expect(block).toMatchObject({
      kind: "CostGatedBlock",
      cost: {
        kind: "compound",
        costs: [
          { kind: "place", bindHostAs: "gaomonHost" },
          { kind: "place", host: { filter: { boundRef: "gaomonHost" } } },
        ],
      },
      actions: [{ kind: "Digivolve", target: { fromSelectionRef: "gaomonHost" } }],
    });
  });

  it("pays the bottom face-down Tamer card to reduce the use cost from 5 to 3", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-096", as: "option" }],
          battleArea: [
            { card: "BT25-021", as: "blueSource" },
            {
              card: "BT25-087",
              as: "thomas",
              under: [
                { card: "AD1-001", faceUp: false, as: "bottomCost" },
                { card: "AD1-002", faceUp: false, as: "upper" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT25-096"));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottomCost").instanceId);
    expect(s.perm("thomas").stack.map((card) => card.instanceId)).toEqual([s.inst("upper").instanceId]);
  });

  it("requires both materials, places them in chosen bottom order, then optionally digivolves for free (Q6456)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-096", as: "option" },
            { card: "BT25-029", as: "mirage" },
          ],
          trash: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-027", as: "mach" },
          ],
          battleArea: [{ card: "BT25-021", as: "gaomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gaomon").topCard?.instanceId === s.inst("mirage").instanceId);

    expect(
      s
        .perm("gaomon")
        .stack.slice(0, 2)
        .map((card) => card.instanceId),
    ).toEqual([s.inst("mach").instanceId, s.inst("gaogamon").instanceId]);
    expect(
      s
        .perm("gaomon")
        .stack.slice(0, 2)
        .every((card) => card.faceUp),
    ).toBe(true);
    expect(s.perm("gaomon").topCard.cardId).toBe("BT25-029");
    expect(s.state.memory).toBe(0);

    const incomplete = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-096", as: "option" }],
          trash: [{ card: "BT25-023", as: "onlyMaterial" }],
          battleArea: [{ card: "BT25-021", as: "gaomon" }],
        },
      },
      // No face-down Tamer source exists here, so the "reduce the play cost" offer is
      // irrelevant; it still poses a decision and must be answered for the option to resolve.
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await incomplete.ready();
    incomplete.state.memory = 5;
    expect(
      incomplete.engine.applyIntent(0, { type: "playCard", instanceId: incomplete.inst("option").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => incomplete.state.players[0]!.trash.some((card) => card.cardId === "BT25-096"));
    expect(incomplete.perm("gaomon").stack).toHaveLength(0);
    expect(incomplete.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      incomplete.inst("onlyMaterial").instanceId,
    );
  });

  it.each([
    ["Gaogamon", "BT5-064", "BT25-027"],
    ["MachGaogamon", "BT25-023", "BT5-068"],
  ])("rejects near-named %s processing material without partial payment", async (_name, first, second) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-096", as: "option" },
            { card: "BT25-029", as: "mirage" },
          ],
          trash: [
            { card: first, as: "first" },
            { card: second, as: "second" },
          ],
          battleArea: [{ card: "BT25-021", as: "host" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.perm("host").topCard.cardId).toBe("BT25-021");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId, optionId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("mirage").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Security may free-play a named card from trash, then adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT25-087", as: "thomas" }],
          security: [{ card: "BT25-096", as: "securityOption" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-087")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });

  it("pays the first face-down Tamer card above a face-up bottom (Q4785)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-096", as: "option" }],
          battleArea: [
            { card: "BT25-021" },
            {
              card: "BT25-087",
              as: "thomas",
              under: [
                { card: "AD1-001", faceUp: true, as: "bottom" },
                { card: "AD1-002", faceUp: false, as: "upper" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT25-096"));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("upper").instanceId);
    expect(s.perm("thomas").stack.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
  });
});
