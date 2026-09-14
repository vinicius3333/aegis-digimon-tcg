// @vitest-environment jsdom
import { Phase } from "@aegis/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { ArenaDemo } from "./ArenaDemo";
import { DEMO_KEYWORDS, type DemoKeyword } from "./arenaDemoKeywords";

const requirement =
  "[Ceresmon] or [Seven Code] trait when this Digimon has a qualifying linked card or an eligible inherited source";
type Expected = { name: string; label?: string; amount?: number; text?: boolean };
// Independent printed expectations: do not use production formatting/parameter helpers as an oracle.
const expected: Record<DemoKeyword, Expected> = {
  Blocker: { name: "Blocker" },
  Piercing: { name: "Piercing" },
  Rush: { name: "Rush" },
  Raid: { name: "Raid" },
  Reboot: { name: "Reboot" },
  Jamming: { name: "Jamming" },
  Retaliation: { name: "Retaliation" },
  Barrier: { name: "Barrier" },
  Evade: { name: "Evade" },
  Save: { name: "Save" },
  Delay: { name: "Delay" },
  Alliance: { name: "Alliance" },
  Fortitude: { name: "Fortitude" },
  Blitz: { name: "Blitz" },
  Collision: { name: "Collision" },
  Vortex: { name: "Vortex" },
  Decoy: { name: "Decoy", text: true },
  Scapegoat: { name: "Scapegoat" },
  Execute: { name: "Execute" },
  Progress: { name: "Progress" },
  IceClad: { name: "Ice Clad" },
  Training: { name: "Training" },
  "Armor Purge": { name: "Armor Purge" },
  "Mind Link": { name: "Mind Link", text: true },
  Ascension: { name: "Ascension" },
  BlastDigivolve: { name: "Blast Digivolve" },
  BlastDNADigivolve: { name: "Blast DNA Digivolve" },
  Draw: { name: "Draw", amount: 2, label: "Draw 2" },
  SecurityAttack: { name: "Security Attack", amount: 2, label: "Security Attack +2" },
  DeDigivolve: { name: "De-Digivolve", amount: 2, label: "De-Digivolve 2" },
  Recovery: { name: "Recovery", amount: 2, label: "Recovery +2 (Deck)" },
  DigiBurst: { name: "Digi-Burst", amount: 2, label: "Digi-Burst 2" },
  Digisorption: { name: "Digisorption", amount: -2, label: "Digisorption -2" },
  MaterialSave: { name: "Material Save", amount: 2, label: "Material Save 2" },
  Link: { name: "Link", amount: 2, label: "Link +2" },
  Fragment: { name: "Fragment", amount: 2, label: "Fragment (2)" },
  Partition: { name: "Partition", text: true },
  Decode: { name: "Decode", text: true },
  Overclock: { name: "Overclock", text: true },
  UseReq: { name: "Use Req.", text: true },
  Engage: { name: "Engage" },
  Guard: { name: "Guard" },
  Detach: { name: "Detach", text: true },
  Succession: { name: "Succession", text: true },
};

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/dev/arena?hand=20&opponentHand=20");
});
afterEach(() => cleanup());

function demo() {
  const ui = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  const field = ui.container.querySelector<HTMLElement>('[data-drop="perm-you"][data-id="you-chronomon"]')!;
  function editor() {
    fireEvent.click(screen.getByRole("button", { name: "Demo tools" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit demo keywords" }));
    return screen.getByRole("dialog", { name: "Grant keywords" });
  }
  function grant(keyword: DemoKeyword, amount = expected[keyword].amount) {
    const panel = screen.getByRole("dialog", { name: "Grant keywords" });
    const item = expected[keyword];
    fireEvent.change(within(panel).getByRole("searchbox"), { target: { value: item.name } });
    const choice = within(within(panel).getByRole("group", { name: "Available keyword" })).getByRole("button", {
      name: item.name,
    });
    fireEvent.click(choice);
    expect(choice.getAttribute("aria-pressed")).toBe("true");
    expect(Boolean(within(panel).queryByRole("spinbutton"))).toBe(item.amount !== undefined);
    expect(Boolean(within(panel).queryByRole("textbox", { name: "Requirement (optional text)" }))).toBe(!!item.text);
    if (amount !== undefined)
      fireEvent.change(within(panel).getByRole("spinbutton"), { target: { value: String(amount) } });
    if (item.text)
      fireEvent.change(within(panel).getByRole("textbox", { name: "Requirement (optional text)" }), {
        target: { value: requirement },
      });
    const button = within(panel).getByRole("button", { name: "Grant keyword" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
  }
  function closeEditor() {
    fireEvent.click(screen.getByRole("button", { name: "View arena" }));
  }
  function inspect(element = field, name = "Chronomon: Holy Mode") {
    fireEvent.keyDown(element, { key: "Enter" });
    return screen.getByRole("dialog", { name });
  }
  function closeDetail() {
    fireEvent.keyDown(document, { key: "Escape" });
  }
  return { ...ui, field, editor, grant, closeEditor, inspect, closeDetail };
}
function printedLabel(keyword: DemoKeyword) {
  const item = expected[keyword];
  return item.text ? `${item.name} (${requirement})` : (item.label ?? item.name);
}

it("covers exactly the authoritative 44-family catalog and independent expectations", () => {
  expect(DEMO_KEYWORDS).toHaveLength(44);
  expect([...DEMO_KEYWORDS].sort()).toEqual(Object.keys(expected).sort());
  expect(requirement.length).toBeGreaterThan(100);
  expect(requirement.length).toBeLessThanOrEqual(120);
});

it.each(DEMO_KEYWORDS)("grants, inspects, removes and resets %s through the actual demo UI", (keyword) => {
  const ui = demo();
  const original = ui.inspect();
  const printed = original.querySelector('[data-role="top"] p')!.textContent;
  const sources = [...original.querySelectorAll('[data-role="stack"]')].map((source) => source.textContent);
  ui.closeDetail();
  ui.editor();
  ui.grant(keyword);
  ui.closeEditor();
  const label = printedLabel(keyword);
  expect(ui.field.querySelector('[aria-label^="Active keywords:"]')?.getAttribute("aria-label")).toBe(
    `Active keywords: ${label}`,
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Phase" }), { target: { value: Phase.End } });
  const panel = ui.inspect();
  const active = within(panel).getByRole("region", { name: "Active keywords" });
  expect(active.querySelector('[data-granted="true"]')?.textContent).toBe(label);
  expect(panel.querySelector('[data-role="top"] p')!.textContent).toBe(printed);
  expect([...panel.querySelectorAll('[data-role="stack"]')].map((source) => source.textContent)).toEqual(sources);
  expect(ui.container.querySelectorAll(".game-hand-card")).toHaveLength(20);
  expect(ui.container.querySelector('[data-drop="perm-opp"] [aria-label^="Active keywords:"]')).toBeNull();
  ui.closeDetail();
  ui.editor();
  fireEvent.click(screen.getByRole("button", { name: `Remove ${label}` }));
  expect(within(screen.getByRole("group", { name: "Granted keywords" })).getByText("No test grants yet.")).toBeTruthy();
  ui.closeEditor();
  expect(ui.field.querySelector('[aria-label^="Active keywords:"]')).toBeNull();
  ui.editor();
  ui.grant(keyword);
  fireEvent.click(screen.getByRole("button", { name: "Reset all" }));
  ui.closeEditor();
  const reset = ui.inspect();
  expect(within(reset).queryByRole("region", { name: "Active keywords" })).toBeNull();
  expect(reset.querySelector('[data-role="top"] p')!.textContent).toBe(printed);
  expect([...reset.querySelectorAll('[data-role="stack"]')].map((source) => source.textContent)).toEqual(sources);
});

it("renders all 44 grants together with a compact field summary and complete focusable inspector list", () => {
  const ui = demo();
  ui.editor();
  for (const keyword of DEMO_KEYWORDS) ui.grant(keyword);
  ui.closeEditor();
  const summary = ui.field.querySelector('[aria-label^="Active keywords:"]')!;
  expect(summary.querySelector('[aria-label="41 more keywords"]')).toBeTruthy();
  const panel = ui.inspect();
  const active = within(panel).getByRole("region", { name: "Active keywords" });
  expect(active.getAttribute("tabindex")).toBe("0");
  expect([...active.querySelectorAll('[data-granted="true"]')].map((chip) => chip.textContent)).toEqual(
    DEMO_KEYWORDS.map((keyword) => printedLabel(keyword)),
  );
  ui.closeDetail();
  ui.editor();
  fireEvent.click(screen.getByRole("button", { name: "Reset all" }));
  ui.closeEditor();
  expect(ui.field.querySelector('[aria-label^="Active keywords:"]')).toBeNull();
});

it("replaces a signed Security Attack grant rather than accumulating it and restores the baseline on removal", () => {
  const ui = demo();
  ui.editor();
  ui.grant("SecurityAttack", 2);
  ui.grant("SecurityAttack", -2);
  ui.closeEditor();
  expect(within(ui.inspect()).getByRole("region", { name: "Active keywords" }).textContent).toBe("Security Attack -2");
  ui.closeDetail();
  ui.editor();
  expect(within(screen.getByRole("group", { name: "Granted keywords" })).getAllByRole("button")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Remove Security Attack -2" }));
  ui.closeEditor();
  expect(within(ui.inspect()).queryByRole("region", { name: "Active keywords" })).toBeNull();
});

it.each([
  ["you-hyokomon", "Hyokomon", '[data-drop="perm-you"][data-id="you-hyokomon"]'],
  ["you-breeding", "Hyokomon · breeding", '[data-drop="breeding-you"]'],
])("targets %s independently of the original attacker and the private opponent hand", (_id, optionName, selector) => {
  const ui = demo();
  const editor = ui.editor();
  fireEvent.change(within(editor).getByRole("combobox", { name: "Your Digimon" }), {
    target: { value: within(editor).getByRole<HTMLOptionElement>("option", { name: optionName }).value },
  });
  ui.grant("Guard");
  ui.closeEditor();
  const target = ui.container.querySelector<HTMLElement>(selector)!;
  expect(target.querySelector('[aria-label="Active keywords: Guard"]')).toBeTruthy();
  expect(ui.field.querySelector('[aria-label^="Active keywords:"]')).toBeNull();
  const panel = ui.inspect(target, "Hyokomon");
  expect(within(panel).getByRole("region", { name: "Active keywords" }).textContent).toBe("Guard");
  expect(ui.container.querySelectorAll(".game-hand-card")).toHaveLength(20);
});
