import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST22-01 Viximon inherited digivolution", () => {
  it("offers a matching evolution after a matching Option is used", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-03", as: "host", under: ["ST22-01", "ST22-02"] },
            { card: "BT1-009", as: "red" },
          ],
          hand: [
            { card: "ST22-04", as: "taomon" },
            { card: "ST22-10", as: "option" },
            { card: "ST22-10", as: "secondOption" },
            { card: "ST22-05", as: "sakuyamon" },
          ],
          deck: ["BT1-002", "BT1-002", "BT1-002", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => host.topCard?.cardId === "ST22-04");
    expect(host.topCard?.cardId).toBe("ST22-04");
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    expect(s.state.memory).toBe(4);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondOption").instanceId })).toEqual({
      ok: true,
    });
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    expect(host.topCard.cardId).toBe("ST22-04");
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("sakuyamon").instanceId)).toBe(true);
  });

  it("does not trigger for an unrelated Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-03", as: "host", under: ["ST22-01", "ST22-02"] },
            { card: "BT1-009", as: "red" },
          ],
          hand: [
            { card: "ST22-04", as: "taomon" },
            { card: "BT1-090", as: "option" },
          ],
          deck: ["BT1-002", "BT1-002", "BT1-002", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    expect(host.topCard?.cardId).toBe("ST22-03");
  });
});

describe("ST22-01 Viximon — KB Q&A rulings", () => {
  async function attackWithTaomonThatDigivolvesMidAttack() {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-04", as: "attacker", under: ["ST22-01"] },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [
            { card: "ST22-10", as: "option" },
            { card: "ST22-05", as: "sakuyamon" },
          ],
          security: [{ card: "BT1-090", as: "topSecurity" }, "BT1-091"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["ST1-02", "ST1-02", "ST1-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 3000);
    return s;
  }

  it("activates its digivolution only after the used Option's [Main] effect resolves (Q5407)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-03", as: "host", under: ["ST22-01"] }],
          hand: [
            { card: "ST22-10", as: "option" },
            { card: "ST22-04", as: "taomon" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "ST22-04");

    const drawIndex = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" && event.to === "hand" && event.instanceIds.includes(s.inst("drawn").instanceId),
    );
    const placedIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "security" && event.instanceIds.includes(optionId),
    );
    const digivolveIndex = s.events.findIndex(
      (event) => event.kind === "digivolved" && event.permanentId === s.perm("host").permanentId,
    );
    expect(drawIndex).toBeGreaterThanOrEqual(0);
    expect(placedIndex).toBeGreaterThan(drawIndex);
    expect(digivolveIndex).toBeGreaterThan(placedIndex);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([optionId]);
  });

  it("does not trigger when an Option's [Security] effect activates without the card being used (Q5408)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-03", as: "host", under: ["ST22-01"] }],
          hand: [
            { card: "ST22-04", as: "taomon" },
            { card: "ST22-10", as: "usedOption" },
          ],
          security: [{ card: "ST22-10", as: "securityOption" }, "BT1-090"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT10-075", dp: 12000, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.perm("opponent").currentDP === 3000);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("ST22-03");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("taomon").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("usedOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "ST22-04");
  });

  it("lets the Taomon it digivolved mid-attack trigger its inherited [End of Attack] effect (Q5416)", async () => {
    const s = await attackWithTaomonThatDigivolvesMidAttack();
    const attacker = s.perm("attacker");

    expect(attacker.topCard.cardId).toBe("ST22-05");
    expect(attacker.stack.map((card) => card.cardId)).toEqual(["ST22-01", "ST22-04"]);
    const checkIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    const endOfAttackIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "ST22-04" && event.isInherited === true,
    );
    expect(endOfAttackIndex).toBeGreaterThan(checkIndex);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);
    expect(attacker.isSuspended).toBe(false);
  });

  it("does not offer <Alliance> to the Sakuyamon it digivolved into after the attack was declared (Q5420)", async () => {
    const s = await attackWithTaomonThatDigivolvesMidAttack();

    expect(s.perm("attacker").topCard.cardId).toBe("ST22-05");
    expect(s.events.some((event) => event.kind === "alliancePrompt")).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
  });
});
