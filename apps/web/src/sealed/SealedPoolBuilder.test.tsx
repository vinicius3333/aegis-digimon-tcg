import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SealedPoolBuilder } from "@/sealed/SealedPoolBuilder";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
type PropsReady = (input: unknown) => Promise<{ ok: true; value: SealedOwnPool }>;
import type { SealedOwnPool } from "@aegis/shared/sealed/SealedContracts";

vi.mock("@/packOpening/scene/PackOpeningScene", () => ({
  PackOpeningScene: (props: { phase: string; onPhaseComplete: (phase: string) => void }) => (
    <div data-testid="scene" data-phase={props.phase}>
      <button onClick={() => props.onPhaseComplete("choosing")}>Settle carousel</button>
      <button onClick={() => props.onPhaseComplete("burst")}>Complete charge</button>
      <button onClick={() => props.onPhaseComplete("revealing")}>Complete tear</button>
    </div>
  ),
}));

async function completePacks() {
  fireEvent.click(screen.getByRole("button", { name: "Open packs" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "Skip animations" }));
  fireEvent.click(screen.getByRole("button", { name: /^Open all packs/ }));
  fireEvent.click(screen.getByRole("button", { name: "Back to deck building" }));
}

afterEach(() => {
  sessionStorage.clear();
  cleanup();
  vi.useRealTimers();
});
it("keeps edits through stale polls, shows legality, and honors a server lock", async () => {
  let pool: SealedOwnPool = {
    configuration: getSealedConfiguration({ setId: "BT4" }),
    packs: [[{ cardId: "BT4-009" }, { cardId: "BT4-009" }]],
    revision: 0,
    window: "initial",
    deck: null,
    ready: false,
    editable: true,
    deadlineAt: Date.now() + 600000,
  };
  const load = vi.fn<() => Promise<{ ok: true; value: SealedOwnPool }>>(async () => ({
    ok: true as const,
    value: { ...pool },
  }));
  vi.useFakeTimers();
  render(
    <I18nProvider>
      <SealedPoolBuilder
        loadPool={load}
        readyDeck={vi.fn<() => Promise<{ ok: true; value: SealedOwnPool }>>()}
        onReady={() => undefined}
      />
    </I18nProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await completePacks();
  expect(document.querySelector('[data-pool-card="BT4-009"]')).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Your decks$/ })).toBeNull();
  const card = document.querySelector('[data-pool-card="BT4-009"]')! as HTMLElement;
  fireEvent.click(within(card).getByRole("button", { name: "Add" }));
  expect(screen.getByText("39 main cards remaining", { exact: false })).toBeTruthy();
  expect(
    screen.getAllByRole("button", { name: "Ready" }).every((button) => (button as HTMLButtonElement).disabled),
  ).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(load.mock.calls.length).toBeGreaterThan(1);
  expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 1/40");
  pool = {
    ...pool,
    editable: true,
    ready: true,
    revision: 1,
    deck: { mainDeck: ["BT4-009", "BT4-009"], eggDeck: [], revision: 1 },
  };
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 2/40");
  expect(screen.getByRole("status", { name: "Ready · deck locked" })).toBeTruthy();
  expect(
    within(document.querySelector('[data-pool-card="BT4-009"]')! as HTMLElement).getByRole("button", {
      name: "Remove",
    }),
  ).toHaveProperty("disabled", true);
  pool = { ...pool, revision: 0, editable: true, ready: false, deck: null };
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 2/40");
});

it("explains an expired preparation window and prevents ready", async () => {
  const pool: SealedOwnPool = {
    configuration: getSealedConfiguration({ setId: "BT4" }),
    packs: [[{ cardId: "BT4-009" }]],
    revision: 0,
    window: "initial",
    deck: null,
    ready: false,
    editable: true,
    deadlineAt: Date.now() - 1000,
  };
  vi.useFakeTimers();
  render(
    <I18nProvider>
      <SealedPoolBuilder
        loadPool={async () => ({ ok: true, value: pool })}
        readyDeck={vi.fn<() => Promise<{ ok: true; value: SealedOwnPool }>>()}
        onReady={() => undefined}
      />
    </I18nProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await completePacks();
  expect(screen.getByRole("status", { name: "Preparation expired · deck locked" })).toBeTruthy();
  expect(
    screen.getAllByRole("button", { name: "Ready" }).every((button) => (button as HTMLButtonElement).disabled),
  ).toBe(true);
});

it("sends the exact printing revision, blocks edits while readying and retains the draft on rejection", async () => {
  const pool: SealedOwnPool = {
    configuration: getSealedConfiguration({ setId: "BT4" }),
    packs: [Array.from({ length: 40 }, () => ({ cardId: "BT4-009" }))],
    revision: 3,
    window: "sideboard:1",
    deck: { mainDeck: Array<string>(40).fill("BT4-009"), eggDeck: [], revision: 3 },
    ready: false,
    editable: true,
    deadlineAt: Date.now() + 600000,
  };
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = vi.fn<() => Promise<{ ok: false; error: { status: number; code: string } }>>(async () => {
    await pending;
    return { ok: false, error: { status: 409, code: "revision_conflict" } };
  });
  vi.useFakeTimers();
  render(
    <I18nProvider>
      <SealedPoolBuilder
        loadPool={async () => ({ ok: true, value: pool })}
        readyDeck={ready}
        onReady={() => undefined}
      />
    </I18nProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await completePacks();
  fireEvent.click(
    within(document.querySelector(".deck-current__footer")! as HTMLElement).getByRole("button", {
      name: "Ready",
    }),
  );
  expect(ready).toHaveBeenCalledWith({
    mainDeck: Array<string>(40).fill("BT4-009"),
    eggDeck: [],
    revision: 3,
    window: "sideboard:1",
  });
  expect(
    screen.getAllByRole("button", { name: "Locking deck…" }).every((button) => (button as HTMLButtonElement).disabled),
  ).toBe(true);
  expect(
    within(document.querySelector('[data-pool-card="BT4-009"]')! as HTMLElement).getByRole("button", {
      name: "Remove",
    }),
  ).toHaveProperty("disabled", true);
  await act(async () => {
    release();
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByText("Could not save your deck. Refresh your pool and try again.")).toBeTruthy();
  expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 40/40");
});

it("restores the server deck when the preparation window closes without a revision bump", async () => {
  let pool: SealedOwnPool = {
    configuration: getSealedConfiguration({ setId: "BT4" }),
    packs: [Array.from({ length: 40 }, () => ({ cardId: "BT4-009" }))],
    revision: 3,
    window: "sideboard:1",
    deck: { mainDeck: Array<string>(40).fill("BT4-009"), eggDeck: [], revision: 3 },
    ready: false,
    editable: true,
    deadlineAt: Date.now() + 600000,
  };
  vi.useFakeTimers();
  render(
    <I18nProvider>
      <SealedPoolBuilder
        loadPool={async () => ({ ok: true, value: { ...pool } })}
        readyDeck={vi.fn<() => Promise<{ ok: true; value: SealedOwnPool }>>()}
        onReady={() => undefined}
      />
    </I18nProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await completePacks();
  const card = document.querySelector('[data-pool-card="BT4-009"]')! as HTMLElement;
  fireEvent.click(within(card).getByRole("button", { name: "Remove" }));
  expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 39/40");
  pool = { ...pool, window: null, editable: false, deadlineAt: null };
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 40/40");
  expect(
    within(document.querySelector('[data-pool-card="BT4-009"]')! as HTMLElement).getByRole("button", {
      name: "Remove",
    }),
  ).toHaveProperty("disabled", true);
});

it("keeps every unopened pull out of the initial builder", async () => {
  const pool: SealedOwnPool = {
    configuration: getSealedConfiguration({ setId: "BT4" }),
    packs: Array.from({ length: 6 }, () => Array.from({ length: 12 }, () => ({ cardId: "BT4-009" }))),
    revision: 0,
    window: "initial",
    deck: null,
    ready: false,
    editable: true,
    deadlineAt: Date.now() + 600000,
  };
  render(
    <I18nProvider>
      <SealedPoolBuilder
        loadPool={async () => ({ ok: true, value: pool })}
        readyDeck={vi.fn<PropsReady>()}
        onReady={() => undefined}
      />
    </I18nProvider>,
  );
  await screen.findByRole("heading", { name: "Your pool & deck" });
  expect(document.querySelectorAll("[data-pool-card]")).toHaveLength(0);
  expect(screen.queryByRole("button", { name: /^View deck/ })).toBeNull();
});

it("admits only finalized packs across cancellation, polling and browser-session restoration", async () => {
  const pool: SealedOwnPool = {
    configuration: getSealedConfiguration({ setId: "BT4" }),
    packs: Array.from({ length: 6 }, (_, index) => [
      { cardId: "BT4-104", artId: index === 0 ? "BT4-104" : "BT4-104_P1" },
      ...Array.from({ length: 11 }, () => ({ cardId: index === 0 ? "BT4-009" : "BT4-010" })),
    ]),
    revision: 0,
    window: "initial",
    deck: null,
    ready: false,
    editable: true,
    deadlineAt: Date.now() + 600000,
  };
  const load = vi.fn<() => Promise<{ ok: true; value: SealedOwnPool }>>(async () => ({
    ok: true as const,
    value: { ...pool, packs: pool.packs.map((pack) => [...pack]) },
  }));
  function getBuilder() {
    return (
      <I18nProvider>
        <SealedPoolBuilder loadPool={load} readyDeck={vi.fn<PropsReady>()} onReady={() => undefined} />
      </I18nProvider>
    );
  }
  vi.useFakeTimers();
  let view = render(getBuilder());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(document.querySelectorAll("[data-pool-card]")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Open packs" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  fireEvent.click(screen.getByText("Settle carousel"));
  fireEvent.click(screen.getByRole("button", { name: "Open pack" }));
  expect(screen.getByTestId("scene").dataset.phase).toBe("charging");
  fireEvent.click(screen.getByRole("button", { name: "Back to deck building" }));
  expect(document.querySelectorAll("[data-pool-card]")).toHaveLength(0);
  view.unmount();
  view = render(getBuilder());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(document.querySelectorAll("[data-pool-card]")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Open packs" }));
  expect(screen.getByTestId("scene").dataset.phase).toBe("charging");
  fireEvent.click(screen.getByText("Complete charge"));
  fireEvent.click(screen.getByText("Complete tear"));
  expect(screen.getByText("1 / 12")).toBeTruthy();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  view.unmount();
  view = render(getBuilder());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  fireEvent.click(screen.getByRole("button", { name: "Open packs" }));
  expect(screen.getByText("1 / 12")).toBeTruthy();
  expect(screen.queryByText("Opened packs (1)")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reveal all" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to deck building" }));
  expect(document.querySelector('[data-pool-card="BT4-010"]')).toBeNull();
  const card = document.querySelector('[data-pool-card="BT4-104"]')! as HTMLElement;
  fireEvent.click(within(card).getByRole("button", { name: "Add" }));
  expect(within(card).getByRole("button", { name: "Add" })).toHaveProperty("disabled", true);
  fireEvent.click(within(card).getByRole("button", { name: "Card info" }));
  const details = screen.getByRole("dialog", { name: "Card detail" });
  expect(within(details).getByText("1 / 1 available")).toBeTruthy();
  expect(details.querySelectorAll(".card-detail-art-picker button").length).toBeLessThanOrEqual(1);
  fireEvent.keyDown(document, { key: "Escape" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(document.querySelector('[data-pool-card="BT4-010"]')).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open packs" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Skip animations" }));
  fireEvent.click(screen.getByRole("button", { name: "Open all packs (5)" }));
  expect(screen.getByRole("heading", { name: "All cards (60)" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to deck building" }));
  expect(document.querySelector('[data-pool-card="BT4-010"]')).toBeTruthy();
  view.unmount();
  render(getBuilder());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(document.querySelector('[data-pool-card="BT4-010"]')).toBeTruthy();
  expect(document.querySelector('[data-pool-card="BT4-104"]')).toBeTruthy();
});
