import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { compiled } from "./BT26-086.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-086 compiled behavior", () => {
  it("proves Assembly, Link +6, intrinsic keywords, and the link-then-attack windows", () => {
    expect(getCardDefinition("BT26-086")).toMatchObject({
      nameEn: "Dantemon",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 14,
      dp: 14000,
      forms: ["Unknown", "Appmon"],
      attributes: ["Unknown"],
      types: ["Open (App Name)"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.assemblyRequirement).toEqual([
      { reduceCost: 7, materials: [{ kinds: ["Digimon"], traits: ["Seven Code"], count: 7, differentNames: true }] },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Rush" }),
        expect.objectContaining({ keyword: "Reboot" }),
        expect.objectContaining({ keyword: "Blocker" }),
        expect.objectContaining({ keyword: "Link", amount: 6 }),
      ]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toEqual([
        expect.objectContaining({
          kind: "Link",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: expect.objectContaining({
            count: 7,
            upTo: true,
            distinctNames: true,
            filter: expect.objectContaining({
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            }),
          }),
        }),
        expect.objectContaining({ kind: "Attack", withoutSuspending: true, optional: true }),
      ]);
    }
  });

  it("assembles from the seven differently named Seven Code Digimon for 7", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-086", as: "dantemon" }],
          trash: [
            { card: "BT26-010", as: "first" },
            { card: "BT26-019", as: "second" },
            { card: "BT26-028", as: "third" },
            { card: "BT26-037", as: "fourth" },
            { card: "BT26-051", as: "fifth" },
            { card: "BT26-063", as: "sixth" },
            { card: "BT26-084", as: "seventh" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dantemon").instanceId,
        assembly: {
          materialInstanceIds: ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"].map(
            (alias) => s.inst(alias).instanceId,
          ),
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-086"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("dantemon").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"]),
    );
  });

  it("rejects Seven Code PAD as an Assembly material because the header requires Digimon cards", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-086", as: "dantemon" }],
        trash: [
          { card: "BT26-010", as: "first" },
          { card: "BT26-019", as: "second" },
          { card: "BT26-028", as: "third" },
          { card: "BT26-037", as: "fourth" },
          { card: "BT26-051", as: "fifth" },
          { card: "BT26-063", as: "sixth" },
          { card: "BT26-102", as: "option" },
        ],
      },
    });
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dantemon").instanceId,
        assembly: {
          materialInstanceIds: ["first", "second", "third", "fourth", "fifth", "sixth", "option"].map(
            (alias) => s.inst(alias).instanceId,
          ),
        },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("rejects Assembly when two Seven Code materials have the same name", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-086", as: "dantemon" }],
        trash: [
          { card: "BT26-010", as: "first" },
          { card: "BT26-019", as: "second" },
          { card: "BT26-028", as: "third" },
          { card: "BT26-037", as: "fourth" },
          { card: "BT26-051", as: "fifth" },
          { card: "BT26-063", as: "sixth" },
          { card: "BT26-063", as: "duplicate" },
        ],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dantemon").instanceId,
        assembly: {
          materialInstanceIds: ["first", "second", "third", "fourth", "fifth", "sixth", "duplicate"].map(
            (alias) => s.inst(alias).instanceId,
          ),
        },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(7);
  });

  it("keeps the different-name and seven-link conditional seams explicit", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions[0]).toMatchObject({
      differentNames: true,
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "Delete", optional: true },
            {
              kind: "Return",
              to: "deckBottom",
              condition: { kind: "selfLinkCountAtLeast", value: 7 },
              target: { filter: { controller: "opponent", zone: "security", position: "top" }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("links only Appmon cards from this Digimon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-086",
              as: "dantemon",
              under: [
                { card: "BT26-010", as: "ownSource" },
                { card: "BT26-019", as: "ownMail" },
                { card: "BT26-028", as: "ownMedic" },
                { card: "BT26-037", as: "ownWeather" },
                { card: "BT26-051", as: "ownGomi" },
                { card: "BT26-063", as: "ownTeller" },
                { card: "BT26-084", as: "ownCopipe" },
              ],
            },
            { card: "BT1-084", as: "neighbor", under: [{ card: "BT26-019", as: "otherSource" }] },
          ],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dantemon"));

    expect(s.perm("dantemon").linked.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining([
        "BT26-010",
        "BT26-019",
        "BT26-028",
        "BT26-037",
        "BT26-051",
        "BT26-063",
        "BT26-084",
      ]),
    );
    expect(s.perm("dantemon").linked).toHaveLength(7);
    expect(s.perm("neighbor").stack.map(({ cardId }) => cardId)).toEqual(["BT26-019"]);
    expect(s.perm("dantemon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("publishes Rush, Reboot, Blocker, and enough Link capacity for seven cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-086",
            as: "dantemon",
            suspended: true,
            linked: [
              { card: "BT26-010" },
              { card: "BT26-019" },
              { card: "BT26-028" },
              { card: "BT26-037" },
              { card: "BT26-051" },
              { card: "BT26-063" },
              { card: "BT26-084" },
            ],
          },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("dantemon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dantemon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dantemon"), "Blocker")).toBe(true);
    expect(observe(s.engine).linkMaxDelta(s.perm("dantemon"))).toBe(6);
    expect(s.perm("dantemon").linked).toHaveLength(7);
  });

  it("uses Blocker to protect its controller from an opponent's attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-086", as: "dantemon" }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("dantemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("deletes an opposing Digimon and returns its security top card to deck bottom when seven links are present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-086",
              as: "dantemon",
              linked: [
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
              ],
            },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "victim" }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.perm("dantemon").linked.push(...s.state.players[0]!.trash.splice(0));
    expect(s.perm("dantemon").linked).toHaveLength(7);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("dantemon").permanentId,
    });

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("uses the linked reaction only once per turn and needs seven links to return security to deck", async () => {
    const once = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-086",
              as: "dantemon",
              linked: [
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await once.ready();

    await advance(once.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: once.perm("dantemon").permanentId,
    });
    await advance(once.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: once.perm("dantemon").permanentId,
    });

    expect(once.state.players[1]!.battleArea).toHaveLength(1);
    expect(once.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(once.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);

    const belowSeven = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-086",
              as: "dantemon",
              linked: [
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
                { card: "BT26-010" },
              ],
            },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim" }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await belowSeven.ready();

    await advance(belowSeven.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: belowSeven.perm("dantemon").permanentId,
    });

    expect(belowSeven.state.players[1]!.battleArea).toHaveLength(0);
    expect(belowSeven.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
  });
});
