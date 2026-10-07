/* The match's board look and audio settings: board colors and battlefield, the same
   controls the Settings screen has, plus music, sound effects and board display. The
   stores apply every change to the board and the audio behind the dialog as soon as
   it is picked. */

import { useId } from "react";
import { ArenaLookSettings } from "../../../design/ArenaLookSettings";
import type { ArenaDeckColors } from "../../../design/arenaPalette";
import { Dialog } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { ArenaAudioSettings } from "./ArenaAudioSettings";
import { ArenaBoardSettings } from "./ArenaBoardSettings";

export function ArenaLookDialog({
  deckColors,
  onClose,
  onSortHand,
}: {
  deckColors: ArenaDeckColors;
  onClose: () => void;
  onSortHand?: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Dialog className="game-arena-look-dialog" labelledBy={titleId} onClose={onClose}>
      <header className="aegis-dialog__header game-arena-look-dialog__header">
        <div>
          <h2 id={titleId}>{t("redesign.arena.look.title")}</h2>
          <p>{t("redesign.arena.look.description")}</p>
        </div>
        <button type="button" className="aegis-dialog__close" onClick={onClose} aria-label={t("common.close")}>
          <Icons.X size={18} />
        </button>
      </header>
      <ArenaAudioSettings />
      <ArenaBoardSettings onSortHand={onSortHand} />
      <ArenaLookSettings deckColors={deckColors} showThemeChoice />
    </Dialog>
  );
}
