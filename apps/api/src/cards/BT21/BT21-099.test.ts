import { observe } from "../../engine/testkit/observe.js";
import { describe, expect, it } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-099.js";
import "../index.js";

describe("BT21-099 Xros Up", () => {
  it("executes the Main placement by moving a Save Digimon from hand under an own Tamer", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT21-089", as: "tamer", under: [{ card: "BT1-009", as: "existing" }] }],
          hand: [
            { card: "BT14-057", as: "save" },
            { card: "BT21-099", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("save").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("save").instanceId)).toBe(false);
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT14-057")).toBe(true);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      s.inst("save").instanceId,
      s.inst("existing").instanceId,
    ]);
    expect(s.state.memory).toBe(9);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("places Save from hand/trash under a Tamer and offers Save digivolution from trash", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    const place = main?.actions[0];
    expect(place).toMatchObject({
      kind: "PlaceUnder",
      from: ["hand", "trash"],
      target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Save"], match: "text" }] } },
      underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
      position: "bottom",
      optional: true,
    });
    const digivolve = main?.actions[1];
    expect(digivolve).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: false,
      optional: true,
      into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
    });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      optional: true,
      target: { filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Save"], match: "text" }] } },
    });
    expect(security?.actions[1]).toEqual({ kind: "AddToHandSelf" });
  });

  it("Security plays a cost-5-or-less Save Digimon from trash and adds itself to hand", async () => {
    const s = setup(
      {
        0: {
          security: [{ card: "BT21-099", as: "option" }],
          trash: [{ card: "BT14-057", as: "save" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("save").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("publicly performs the optional placement and free Save digivolution in sequence", async () => {
    const preferred: string[] = [];
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT21-089", as: "tamer" },
            { card: "BT21-063", as: "host" },
          ],
          hand: [
            { card: "BT21-099", as: "option" },
            { card: "BT14-057", as: "placed" },
          ],
          trash: [{ card: "BT21-066", as: "evolved" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("placed").instanceId, s.inst("evolved").instanceId, s.perm("host").permanentId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("evolved").instanceId);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT21-066");
    expect(s.state.memory).toBe(2);
  });

  it("publicly refuses both optional Main actions while retaining eligible Save cards", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT21-089", as: "tamer" },
            { card: "BT21-063", as: "host" },
          ],
          hand: [
            { card: "BT21-099", as: "option" },
            { card: "BT14-057", as: "save" },
          ],
          trash: [{ card: "BT21-066", as: "evolved" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("save").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("evolved").instanceId)).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.perm("host").topCard.cardId).toBe("BT21-063");
    expect(s.state.memory).toBe(2);
  });

  it("leaves both optional Main actions inert when no Save cards are available", async () => {
    const s = setup({
      0: {
        battleArea: [
          { card: "BT21-089", as: "tamer" },
          { card: "BT21-063", as: "host" },
        ],
        hand: [
          { card: "BT21-099", as: "option" },
          { card: "BT1-009", as: "unrelated" },
        ],
        trash: ["BT1-010"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("unrelated").instanceId)).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.perm("host").topCard.cardId).toBe("BT21-063");
  });

  it("publicly plays a cost-5-or-less Save Digimon from hand during Security", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          security: [{ card: "BT21-099", as: "option" }],
          hand: [{ card: "BT14-057", as: "save" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("save").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("save").instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
