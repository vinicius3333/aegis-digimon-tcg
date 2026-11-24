import { Decoder, Encoder } from "@colyseus/schema";
import { GameState, Phase, type Seat } from "@aegis/shared";
import { expect, it } from "vitest";
import { setupEngine } from "../testkit/harness.js";

it.each([
  { seat: 0 as Seat, egg: "BT1-001", rookie: "BT1-009", champion: "AD1-001", alternate: false },
  { seat: 1 as Seat, egg: "BT1-001", rookie: "BT1-009", champion: "AD1-001", alternate: false },
  { seat: 0 as Seat, egg: "BT22-005", rookie: "BT22-008", champion: "BT23-018", alternate: true },
  { seat: 1 as Seat, egg: "BT22-005", rookie: "BT22-008", champion: "BT23-018", alternate: true },
])(
  "shows seat $seat $rookie breeding evolutions to connected and late spectators",
  async ({ seat, egg, rookie, champion, alternate }) => {
    const setup = setupEngine({
      [seat]: {
        eggDeck: [egg],
        hand: [
          { card: rookie, as: "evolver" },
          { card: champion, as: "champion" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      [seat === 0 ? 1 : 0]: { security: 5 },
    });
    setup.state.memory = 10;
    setup.state.turnSeat = seat;
    await setup.ready();
    const encoder = new Encoder(setup.state);
    const targets = ([0, 1, undefined] as (Seat | undefined)[]).map((viewerSeat) => ({
      seat: viewerSeat,
      view: setup.engine.makeStateView(viewerSeat)!,
      decoder: new Decoder(new GameState()),
    }));
    setup.engine.installVisibility((owner, zone, card) => {
      for (const target of targets) setup.engine.exposeCardToView(target.view, target.seat, owner, zone, card);
    });
    const sync = (full = false) => {
      for (const target of targets) setup.engine.refreshStateView(target.view, target.seat);
      const iterator = { offset: 0 };
      if (full) encoder.encodeAll(iterator);
      else encoder.encode(iterator);
      const shared = iterator.offset;
      for (const target of targets) {
        iterator.offset = shared;
        target.decoder.decode(
          full
            ? encoder.encodeAllView(target.view, shared, iterator)
            : encoder.encodeView(target.view, shared, iterator),
        );
      }
      encoder.discardChanges();
    };
    sync(true);
    setup.state.phase = Phase.Breeding;
    expect(setup.engine.applyIntent(seat, { type: "hatchEgg" })).toEqual({ ok: true });
    for (let tick = 0; tick < 20; tick += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      sync();
    }
    setup.state.phase = Phase.Main;
    expect(
      setup.engine.applyIntent(seat, {
        type: "digivolve",
        permanentId: setup.state.players[seat]!.breeding!.permanentId,
        instanceId: setup.inst("evolver").instanceId,
        useAlternateCost: alternate,
      }),
    ).toEqual({ ok: true });
    for (let tick = 0; tick < 20; tick += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      sync();
    }
    expect(setup.state.players[seat]!.breeding!.topCard.cardId).toBe(rookie);
    for (const target of targets)
      expect(target.decoder.state.players[seat]!.breeding!.topCard.cardId, `viewer ${target.seat ?? "spectator"}`).toBe(
        rookie,
      );
    expect(
      setup.engine.applyIntent(seat, {
        type: "digivolve",
        permanentId: setup.state.players[seat]!.breeding!.permanentId,
        instanceId: setup.inst("champion").instanceId,
      }),
    ).toEqual({ ok: true });
    for (let tick = 0; tick < 20; tick += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      sync();
    }
    for (const target of targets) {
      expect(target.decoder.state.players[seat]!.breeding!.topCard.cardId).toBe(champion);
      expect(target.decoder.state.players[seat]!.breeding!.stack.map((card) => card.cardId)).toEqual([egg, rookie]);
    }
    targets.push({
      seat: undefined,
      view: setup.engine.makeStateView(undefined)!,
      decoder: new Decoder(new GameState()),
    });
    sync(true);
    expect(targets.at(-1)!.decoder.state.players[seat]!.breeding!.topCard.cardId).toBe(champion);
    for (const target of targets.filter((viewer) => viewer.seat === undefined)) {
      for (const player of target.decoder.state.players) {
        expect(player.hand).toHaveLength(0);
        expect(player.deck).toHaveLength(0);
        expect(player.eggDeck).toHaveLength(0);
        expect(player.security).toHaveLength(0);
      }
    }
    for (const target of targets) target.view.dispose();
  },
);
