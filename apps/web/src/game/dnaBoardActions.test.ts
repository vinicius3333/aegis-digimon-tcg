import { CardInstance, GameState, Permanent, PlayerState } from "@aegis/shared";
import { expect, it, vi } from "vitest";
import { translator } from "../i18n";
import { boardActions } from "./screen/boardActions";
import { DragKind } from "./screen/enums";

vi.mock("./screen/dropZones", () => ({ dropZoneAt: () => ({ target: "perm-you", id: "purple-two" }) }));

it.each([false, true])(
  "#5166: tap and drop choose the touched DNA stack only while Main actions are open (blocked %s)",
  (blocked) => {
    const viewer = new PlayerState();
    const secondPurple = new Permanent();
    secondPurple.permanentId = "purple-two";
    secondPurple.topCard = Object.assign(new CardInstance(), { cardId: "ST10-12", instanceId: "purple-top" });
    viewer.battleArea.push(secondPurple);
    const setActionConfirm = vi.fn<(value: unknown) => void>();
    const actions = boardActions({
      state: new GameState(),
      shownState: new GameState(),
      viewer,
      room: undefined,
      t: translator("en"),
      handEntries: [
        {
          cardId: "ST10-06",
          instanceId: "mastemon",
          activatableEffectsJson: "",
          playableFromHand: true,
          projectedPlayCost: 13,
          digivolveTargetPermanentIds: [],
          linkTargetPermanentIds: [],
          dnaDigivolveRoutes: [
            { materialPermanentIds: ["yellow", "purple-one"], projectedCost: 0 },
            { materialPermanentIds: ["yellow", "purple-two"], projectedCost: 0 },
          ],
        },
      ],
      handSel: "mastemon",
      selPerm: null,
      selCardId: "ST10-06",
      linkSel: null,
      vortexMode: false,
      isMyTurn: true,
      mainActionBlocked: blocked,
      breedingActionsOpen: false,
      permanentRefs: { current: {} },
      ping: vi.fn<() => void>(),
      playGameCue: vi.fn<() => void>(),
      selection: {
        clearSel: vi.fn<() => void>(),
        setHandSel: vi.fn<() => void>(),
        setHandPreview: vi.fn<() => void>(),
        setSelPerm: vi.fn<() => void>(),
        setVortexMode: vi.fn<() => void>(),
        setLinkSel: vi.fn<() => void>(),
      },
      overlays: {
        setActionConfirm,
        setCardMenu: vi.fn<() => void>(),
        setStackView: vi.fn<() => void>(),
        setPicks: vi.fn<() => void>(),
        setDualPlay: vi.fn<() => void>(),
        setAssemblyPick: vi.fn<() => void>(),
        setDigiXrosPick: vi.fn<() => void>(),
        setEvoCostChoice: vi.fn<() => void>(),
      },
      setAppFusionChoice: vi.fn<() => void>(),
      playCard: vi.fn<() => void>(),
      attack: vi.fn<() => void>(),
      linkCard: vi.fn<() => void>(),
      digivolveWithChoice: vi.fn<() => void>(),
      digivolveTargetsOf: () => [],
      appFusionHostIdsOf: () => [],
      eligibleBase: () => false,
      linkTargetsOfPermanent: () => [],
    });
    actions.onYourPerm(secondPurple)?.();
    actions.handleDrop(
      {
        kind: DragKind.Play,
        instanceId: "mastemon",
        cardId: "ST10-06",
        started: true,
        index: 0,
        ox: 0,
        oy: 0,
        x: 0,
        y: 0,
      },
      0,
      0,
    );
    expect(setActionConfirm.mock.calls).toEqual(
      blocked
        ? []
        : [
            [
              {
                kind: "dna",
                instanceId: "mastemon",
                cardId: "ST10-06",
                materialPermanentIds: ["yellow", "purple-two"],
                initialPermanentId: "purple-two",
              },
            ],
            [
              {
                kind: "dna",
                instanceId: "mastemon",
                cardId: "ST10-06",
                materialPermanentIds: ["yellow", "purple-two"],
                initialPermanentId: "purple-two",
              },
            ],
          ],
    );
  },
);
