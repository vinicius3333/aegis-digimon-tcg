import { HelpTip } from "@/design/HelpTip";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import "@/bugs/bugForum.css";

type AegisCoinBalanceParams = { coins: number; size?: "sm" | "lg" };

export function AegisCoinBalance({ coins, size = "sm" }: AegisCoinBalanceParams) {
  const { t, locale } = useTranslation();
  return (
    <span className="aegis-coins" data-size={size}>
      <span className="aegis-coins__mark" aria-hidden="true">
        <Icons.Hexagon size={size === "lg" ? 20 : 14} />
      </span>
      <b>{coins.toLocaleString(locale)}</b>
      <span>{t("bugForum.coinsLabel")}</span>
      <HelpTip label={t("bugForum.coinsHelpLabel")}>{t("bugForum.coinsHelp")}</HelpTip>
    </span>
  );
}
