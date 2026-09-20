// @vitest-environment jsdom
import {
  CardInstance,
  GameState,
  PendingDecision,
  Permanent,
  Phase,
  PlayerState,
  getCardDefinition,
  type DecisionRequest,
  type Seat,
} from "@aegis/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { GameScreen } from "./GameScreen";
import { CardActionMenu } from "./overlay";
import { buildPermanentDetail } from "./permanentDetail";
import { groupedInspectorEvolutionCosts, inlineInspectorKeywordLines } from "./arenaInspectorModel";
import { PermanentView } from "./piece";
import { Side } from "./side";

it("shows opposing Digimon effect protection on the board and removes the badge when it expires", () => {
  const source = permanent(0);
  source.immuneToOpponentDigimonEffects = true;
  const view = () => (
    <I18nProvider>
      <PermanentView perm={source} />
    </I18nProvider>
  );
  const { rerender } = render(view());
  expect(screen.getByText("Digimon protection").getAttribute("data-protection")).toBe("true");
  source.immuneToOpponentDigimonEffects = false;
  rerender(view());
  expect(screen.queryByText("Digimon protection")).toBeNull();
});

it("shows active opposing Digimon effect protection in the card inspector", () => {
  const source = permanent(0);
  source.immuneToOpponentDigimonEffects = true;
  render(
    <I18nProvider>
      <CardActionMenu
        x={0}
        y={0}
        arenaInspection={{ side: Side.Viewer, container: null }}
        detail={buildPermanentDetail(source)}
        canAttack={false}
        onAttack={() => undefined}
        onViewStack={() => undefined}
        onClose={() => undefined}
      />
    </I18nProvider>,
  );
  expect(screen.getByText("Protected from opposing Digimon effects").hasAttribute("data-protection")).toBe(true);
});

it("shows a face-down Tamer source as a back without its identity, effect, or zoom", () => {
  const source = permanent(0);
  source.topCard.cardId = "BT25-090";
  const hidden = new CardInstance();
  hidden.cardId = "BT25-057";
  hidden.artId = "BT25-057_P1";
  hidden.faceUp = false;
  source.stack.push(hidden);
  const detail = buildPermanentDetail(source);
  expect(detail.cards.find((entry) => entry.faceDown)).toMatchObject({ cardId: "", faceDown: true });
  render(
    <I18nProvider>
      <CardActionMenu
        x={0}
        y={0}
        arenaInspection={{ side: Side.Viewer, container: null }}
        detail={detail}
        canAttack={false}
        onAttack={() => undefined}
        onViewStack={() => undefined}
        onClose={() => undefined}
      />
    </I18nProvider>,
  );
  const panel = screen.getByRole("dialog", { name: "Tomoro Tenma" });
  expect(within(panel).getByText("Face-down card")).toBeTruthy();
  expect(panel.textContent).not.toContain("Monarchlizamon");
  expect(panel.querySelector('[data-card-id="BT25-057"]')).toBeNull();
  expect(within(panel).queryByRole("button", { name: /Open Monarchlizamon/ })).toBeNull();
});

it("shows Plutomon's equal-cost Black and Purple digivolution routes as explicit alternatives", () => {
  const source = permanent(0);
  source.topCard.cardId = "BT26-059";
  render(
    <I18nProvider>
      <CardActionMenu
        x={0}
        y={0}
        arenaInspection={{ side: Side.Viewer, container: null }}
        detail={buildPermanentDetail(source)}
        canAttack={false}
        onAttack={() => undefined}
        onViewStack={() => undefined}
        onClose={() => undefined}
      />
    </I18nProvider>,
  );
  const panel = screen.getByRole("dialog", { name: "Plutomon" });
  const routes = panel.querySelectorAll<HTMLElement>(".arena-permanent-inspector__evolution");
  expect(routes).toHaveLength(1);
  expect(routes[0]!.textContent).toContain("Digivolve cost 5 · Lv.5");
  expect(within(routes[0]!).getByText("Black")).toBeTruthy();
  expect(within(routes[0]!).getByText("Purple")).toBeTruthy();
  expect(routes[0]!.textContent).toContain("Black or Purple");
  expect(getCardDefinition("BT26-059")!.evoCosts).toEqual([
    { color: "Black", level: 5, memoryCost: 5 },
    { color: "Purple", level: 5, memoryCost: 5 },
  ]);
});

it("localizes Plutomon's color alternatives while preserving the canonical color dots", () => {
  localStorage.setItem("aegis:locale", "pt-BR");
  const source = permanent(0);
  source.topCard.cardId = "BT26-059";
  render(
    <I18nProvider>
      <CardActionMenu
        x={0}
        y={0}
        arenaInspection={{ side: Side.Viewer, container: null }}
        detail={buildPermanentDetail(source)}
        canAttack={false}
        onAttack={() => undefined}
        onViewStack={() => undefined}
        onClose={() => undefined}
      />
    </I18nProvider>,
  );
  const route = screen
    .getByRole("dialog", { name: "Plutomon" })
    .querySelector(".arena-permanent-inspector__evolution")!;
  expect(route.textContent).toContain("Preto ou Roxo");
  expect(route.querySelector('[data-color="Black"] i')).toBeTruthy();
  expect(route.querySelector('[data-color="Purple"] i')).toBeTruthy();
});

it("keeps consecutive standalone keywords inline without merging effect paragraphs or inline action keywords", () => {
  const text =
    "[Digivolve] Lv.5: Cost 3\n\n＜Piercing＞ \n＜Engage＞ \n[On Play] Delete 1 Digimon. Then, ＜Recovery +1＞\n[All Turns] Prevent departure.\n\n＜Blocker＞\n\n＜Rush＞";
  expect(inlineInspectorKeywordLines(text)).toBe(
    "[Digivolve] Lv.5: Cost 3\n\n＜Piercing＞ ＜Engage＞\n[On Play] Delete 1 Digimon. Then, ＜Recovery +1＞\n[All Turns] Prevent departure.\n\n＜Blocker＞\n\n＜Rush＞",
  );
});

it("places Chronomon's Piercing and Engage on one wrapping keyword line in the inspector", () => {
  const source = permanent(0);
  source.topCard.cardId = "BT26-016";
  render(
    <I18nProvider>
      <CardActionMenu
        x={0}
        y={0}
        arenaInspection={{ side: Side.Viewer, container: null }}
        detail={buildPermanentDetail(source)}
        canAttack={false}
        onAttack={() => undefined}
        onViewStack={() => undefined}
        onClose={() => undefined}
      />
    </I18nProvider>,
  );
  const printed = screen.getByRole("dialog", { name: "Chronomon: Holy Mode" }).querySelector('[data-role="top"] p')!;
  expect(printed.textContent).toContain("＜Piercing＞ ＜Engage＞\n[On Play]");
  expect([...printed.querySelectorAll("mark")].map((chip) => chip.textContent)).toEqual([
    "[Digivolve]",
    "[TS]",
    "＜Piercing＞",
    "＜Engage＞",
    "[On Play]",
    "[When Digivolving]",
    "[When Attacking]",
    "[Once Per Turn]",
    "＜Recovery +1＞",
    "[All Turns]",
    "[Once Per Turn]",
  ]);
});

it("keeps DeckerGreymon's different level and memory requirements separate", () => {
  const definition = getCardDefinition("BT10-026")!;
  expect(groupedInspectorEvolutionCosts(definition.evoCosts)).toEqual([
    { colors: ["Blue"], level: 4, memoryCost: 4 },
    { colors: ["Blue"], level: 5, memoryCost: 2 },
  ]);
});

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

function card(cardId: string, instanceId: string, seat: Seat): CardInstance {
  const instance = new CardInstance();
  instance.cardId = cardId;
  instance.instanceId = instanceId;
  instance.ownerSeat = seat;
  return instance;
}

function permanent(seat: Seat): Permanent {
  const result = new Permanent();
  result.permanentId = `permanent-${seat}`;
  result.controllerSeat = seat;
  result.topCard = card("ST1-09", `top-${seat}`, seat);
  result.stack.push(
    card("ST1-01", `bottom-${seat}`, seat),
    card("ST1-03", `middle-${seat}`, seat),
    card("ST1-07", `below-top-${seat}`, seat),
  );
  result.baseDP = 7000;
  result.currentDP = 9000;
  return result;
}

it.each([
  ["you", "upper", 0],
  ["opp", "lower", 1],
] as const)("clicking a %s card pins its details over the %s half", async (side, half, seat: Seat) => {
  const state = new GameState();
  state.phase = Phase.Main;
  for (const playerSeat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = playerSeat;
    player.sessionId = `session-${playerSeat}`;
    player.battleArea.push(permanent(playerSeat));
    state.players.push(player);
  }
  const { container } = render(
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => undefined}
        demoConnection={{
          room: undefined,
          status: "connected",
          state,
          events: [],
          batches: [],
          decision: undefined,
          acknowledgeDecision: () => undefined,
          error: undefined,
          sessionId: "session-0",
          roomCode: "",
        }}
      />
    </I18nProvider>,
  );
  const selected = container.querySelector<HTMLElement>(`[data-drop="perm-${side}"][data-id="permanent-${seat}"]`)!;
  expect(selected.style.cursor).toBe("pointer");
  fireEvent.mouseEnter(selected);
  await new Promise((resolve) => window.setTimeout(resolve, 400));
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(screen.queryByRole("dialog", { name: "MetalGreymon" })).toBeNull();
  fireEvent.click(selected);
  const inspector = screen.getByRole("dialog", { name: "MetalGreymon" });
  expect(inspector.getAttribute("data-half")).toBe(half);
  expect(inspector.getAttribute("aria-modal")).toBe("false");
  // Portalled out of the board (which clips and isolates it) and pinned back over the
  // arena half through its own fixed rect.
  expect(inspector.closest(".game-board")).toBeNull();
  expect(inspector.parentElement).toBe(document.body);
  expect(screen.queryByRole("button", { name: "View stack" })).toBeNull();
  fireEvent.mouseLeave(selected);
  expect(screen.getByRole("dialog", { name: "MetalGreymon" })).toBe(inspector);
  expect(inspector.querySelectorAll('[data-role="stack"]').length).toBe(3);
  expect(
    inspector.querySelector('[data-role="stack"] .arena-permanent-inspector__effect-label')?.textContent,
  ).toContain("Inherited");
  expect(
    [...inspector.querySelectorAll('[data-role="stack"]')].map((source) => source.getAttribute("data-card-id")),
  ).toEqual(["ST1-07", "ST1-03", "ST1-01"]);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "MetalGreymon" })).toBeNull();
  expect(document.activeElement).toBe(selected);
  fireEvent.keyDown(selected, { key: "Enter" });
  expect(screen.getByRole("dialog", { name: "MetalGreymon" }).getAttribute("data-half")).toBe(half);
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("keeps an own field card inspectable while an effect decision blocks game actions", () => {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 0;
  const pending = new PendingDecision();
  pending.decisionId = "effect-decision";
  pending.seat = 0;
  pending.kind = "optional";
  pending.promptText = "Use this effect?";
  state.pendingDecision = pending;
  const decision: DecisionRequest = {
    decisionId: pending.decisionId,
    seat: pending.seat,
    kind: "optional",
    promptText: pending.promptText,
    sourceInstanceId: "top-0",
  };
  for (const playerSeat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = playerSeat;
    player.sessionId = `session-${playerSeat}`;
    const fieldCard = permanent(playerSeat);
    fieldCard.canAttackPlayer = true;
    player.battleArea.push(fieldCard);
    state.players.push(player);
  }

  const { container } = render(
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => undefined}
        demoConnection={{
          room: undefined,
          status: "connected",
          state,
          events: [],
          batches: [],
          decision,
          acknowledgeDecision: () => undefined,
          error: undefined,
          sessionId: "session-0",
          roomCode: "",
        }}
      />
    </I18nProvider>,
  );

  const selected = container.querySelector<HTMLElement>('[data-drop="perm-you"][data-id="permanent-0"]')!;
  fireEvent.click(selected);

  expect(screen.getByRole("dialog", { name: "MetalGreymon" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Attack" })).toBeNull();
});

it("uses the detail overlay for non-candidates and a magnifier for candidates during a combat decision", () => {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 0;
  const pending = new PendingDecision();
  pending.decisionId = "combat-decision";
  pending.seat = 0;
  pending.kind = "selectCards";
  pending.promptText = "Choose 1 Digimon that may attack.";
  state.pendingDecision = pending;
  const decision: DecisionRequest = {
    decisionId: pending.decisionId,
    seat: pending.seat,
    kind: "selectCards",
    promptText: pending.promptText,
    options: {
      candidateInstanceIds: ["top-1"],
      min: 1,
      max: 1,
    },
  };
  for (const playerSeat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = playerSeat;
    player.sessionId = `session-${playerSeat}`;
    player.battleArea.push(permanent(playerSeat));
    state.players.push(player);
  }

  const { container } = render(
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => undefined}
        demoConnection={{
          room: undefined,
          status: "connected",
          state,
          events: [],
          batches: [],
          decision,
          acknowledgeDecision: () => undefined,
          error: undefined,
          sessionId: "session-0",
          roomCode: "",
        }}
      />
    </I18nProvider>,
  );

  const nonCandidate = container.querySelector<HTMLElement>('[data-drop="perm-you"][data-id="permanent-0"]')!;
  fireEvent.click(nonCandidate);
  expect(screen.getByRole("dialog", { name: "MetalGreymon" })).toBeTruthy();
  fireEvent.keyDown(document, { key: "Escape" });

  const candidate = container.querySelector<HTMLElement>('[data-drop="perm-opp"][data-id="permanent-1"]')!;
  fireEvent.click(candidate);
  expect(screen.queryByRole("dialog", { name: "MetalGreymon" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Read MetalGreymon" }));
  expect(screen.getByRole("dialog", { name: "MetalGreymon" })).toBeTruthy();
});

it("preserves every supplied legal action and zoom while leaving schema source order intact", () => {
  const source = permanent(0);
  source.linked.push(card("BT21-009", "linked", 0));
  const detail = buildPermanentDetail(source);
  const originalCards = [...detail.cards];
  const onAttack = vi.fn<() => void>();
  const onVortex = vi.fn<() => void>();
  const onLink = vi.fn<() => void>();
  const onActivate = vi.fn<() => void>();
  const onPromote = vi.fn<() => void>();
  const onViewStack = vi.fn<() => void>();
  const onClose = vi.fn<() => void>();
  render(
    <I18nProvider>
      <CardActionMenu
        x={0}
        y={0}
        arenaInspection={{ side: Side.Viewer, container: null }}
        detail={detail}
        canAttack
        canVortex
        onAttack={onAttack}
        onVortex={onVortex}
        onViewStack={onViewStack}
        onClose={onClose}
        link={{ onLink }}
        promote={{ label: "Move to battle", onPromote }}
        effects={[{ label: "Server Main effect", onActivate }]}
      />
    </I18nProvider>,
  );
  for (const [name, callback] of [
    ["Attack", onAttack],
    ["Vortex attack", onVortex],
    ["Link", onLink],
    ["Move to battle", onPromote],
    ["Activate effect: Server Main effect", onActivate],
  ] as const) {
    fireEvent.click(screen.getByRole("button", { name }));
    expect(callback).toHaveBeenCalledOnce();
  }
  expect(screen.queryByRole("button", { name: "View stack" })).toBeNull();
  expect(onViewStack).not.toHaveBeenCalled();
  const panel = screen.getByRole("dialog", { name: "MetalGreymon" });
  expect([...panel.querySelectorAll("[data-card-id]")].map((row) => row.getAttribute("data-card-id"))).toEqual([
    "ST1-07",
    "ST1-03",
    "ST1-01",
    "BT21-009",
  ]);
  for (const row of panel.querySelectorAll<HTMLElement>("[data-card-id]")) {
    const definition = getCardDefinition(row.dataset.cardId!);
    expect(row.textContent).toContain(
      row.dataset.role === "linked" ? definition?.linkEffect : definition?.inheritedEffectText,
    );
  }
  expect(detail.cards).toEqual(originalCards);
  expect([...source.stack].map((instance) => instance.cardId)).toEqual(["ST1-01", "ST1-03", "ST1-07"]);
  // The button keeps the whole clause for assistive tech and the tooltip, but wears a short
  // label so one long effect cannot stretch the action row off screen.
  const activate = screen.getByRole("button", { name: "Activate effect: Server Main effect" });
  expect(activate.textContent).toBe("Activate [Main] effect");
  expect(activate.title).toBe("Server Main effect");
  fireEvent.click(screen.getByRole("button", { name: "Enlarge card" }));
  expect(screen.getAllByRole("dialog", { name: "MetalGreymon" })).toHaveLength(2);
  fireEvent.keyDown(window, { key: "Escape" });
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getAllByRole("dialog", { name: "MetalGreymon" })).toHaveLength(1);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledOnce();
});

it("lays a token over a transformed Digimon and reads the change out in the inspector", () => {
  const source = permanent(1);
  source.originalNameOverride = "Sukamon";
  source.originalColorsOverride.push("White");
  source.baseDP = 8000;
  source.originalDPOverride = 3000;
  source.currentDP = 3000;
  render(
    <I18nProvider>
      <PermanentView perm={source} />
    </I18nProvider>,
  );
  expect(screen.getByRole("img", { name: "Transformed into Sukamon, 3,000 DP" })).toBeTruthy();

  cleanup();
  render(
    <I18nProvider>
      <CardActionMenu
        x={0}
        y={0}
        arenaInspection={{ side: Side.Viewer, container: null }}
        detail={buildPermanentDetail(source)}
        canAttack={false}
        onAttack={() => undefined}
        onViewStack={() => undefined}
        onClose={() => undefined}
      />
    </I18nProvider>,
  );
  expect(screen.getByText("Counts as Sukamon")).toBeTruthy();
  expect(screen.queryByText(/original card information/)).toBeNull();
  expect(screen.queryByText(/Only the original information changes/)).toBeNull();
});

it("shows no transformation token or reading while nothing overrode the card information", () => {
  const source = permanent(1);
  expect(buildPermanentDetail(source).transformation).toBeUndefined();
  render(
    <I18nProvider>
      <PermanentView perm={source} />
    </I18nProvider>,
  );
  expect(screen.queryByText("Sukamon")).toBeNull();
});

it("keeps the inspector inside the viewport when the board lays out wider than the screen", () => {
  const board = document.createElement("div");
  board.getBoundingClientRect = () =>
    ({ left: -20, top: -40, width: window.innerWidth + 300, height: window.innerHeight * 3 }) as DOMRect;
  document.body.append(board);
  render(
    <I18nProvider>
      <CardActionMenu
        x={0}
        y={0}
        arenaInspection={{ side: Side.Viewer, container: board }}
        detail={buildPermanentDetail(permanent(0))}
        canAttack={false}
        onAttack={() => undefined}
        onViewStack={() => undefined}
        onClose={() => undefined}
      />
    </I18nProvider>,
  );
  const panel = document.querySelector<HTMLElement>(".arena-permanent-inspector")!;
  expect(panel.style.left).toBe("0px");
  expect(panel.style.width).toBe(`${window.innerWidth}px`);
  expect(panel.style.top).toBe("0px");
  expect(panel.style.height).toBe(`${window.innerHeight}px`);
});
