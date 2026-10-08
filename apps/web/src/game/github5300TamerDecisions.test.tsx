// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type DecisionRequest, type DecisionResponse } from "@aegis/shared";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { DecisionOverlay } from "./overlay/choice/DecisionOverlay";

afterEach(cleanup);

it.each(["BT26-091", "BT26-094"])("#5300 %s suspension condition remains declineable", (sourceCardId) => {
  const onRespond = vi.fn<(response: DecisionResponse) => void>();
  render(
    <I18nProvider>
      <DecisionOverlay
        request={{ decisionId: "condition", seat: 0, kind: "optional", promptText: "Suspend this Tamer", sourceCardId }}
        candidates={[]}
        picks={[]}
        onTogglePick={() => {}}
        onRespond={onRespond}
      />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "No, decline" }));
  expect(onRespond).toHaveBeenCalledExactlyOnceWith({ kind: "optional", accept: false });
});

it("#5300 Yoshino's separate printed may stays declineable after suspension", () => {
  const onRespond = vi.fn<(response: DecisionResponse) => void>();
  render(
    <I18nProvider>
      <DecisionOverlay
        request={{
          decisionId: "paid-condition-payload",
          seat: 0,
          kind: "optional",
          promptText: "Digivolve",
          sourceCardId: "BT26-091",
        }}
        candidates={[]}
        picks={[]}
        onTogglePick={() => {}}
        onRespond={onRespond}
      />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "No, decline" }));
  expect(onRespond).toHaveBeenCalledExactlyOnceWith({ kind: "optional", accept: false });
});

it("#5300 Keenan's mandatory Execute target cannot be skipped after paying suspension", () => {
  const request: DecisionRequest = {
    decisionId: "keenan-execute",
    seat: 0,
    kind: "chooseTargets",
    promptText: "Gain Execute",
    sourceCardId: "BT26-094",
    options: { candidateInstanceIds: ["eligible"], min: 1, max: 1 },
  };
  const onRespond = vi.fn<(response: DecisionResponse) => void>();
  const props = {
    request,
    candidates: [{ instanceId: "eligible", cardId: "BT26-039" }],
    picks: [] as string[],
    onTogglePick: () => {},
    onRespond,
  };
  const view = render(
    <I18nProvider>
      <DecisionOverlay {...props} />
    </I18nProvider>,
  );
  expect(screen.queryByRole("button", { name: "No Selection" })).toBeNull();
  expect(screen.queryByRole("button", { name: "No, decline" })).toBeNull();
  const confirm = screen.getByRole("button", { name: "Confirm targets" }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  fireEvent.click(confirm);
  expect(onRespond).not.toHaveBeenCalled();
  view.rerender(
    <I18nProvider>
      <DecisionOverlay {...props} picks={["eligible"]} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
  expect(onRespond).toHaveBeenCalledExactlyOnceWith({ kind: "chooseTargets", instanceIds: ["eligible"] });
});
