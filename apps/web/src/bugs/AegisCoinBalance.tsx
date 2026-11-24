import { HelpTip } from "@/design/HelpTip";
import { useTranslation } from "@/i18n/useTranslation";
import "@/bugs/forum.css";

const COIN_SRC = "/branding/aegis-coin.png";

type AegisCoinBalanceParams = { coins: number; size?: "sm" | "lg" };

export function AegisCoinBalance({ coins, size = "sm" }: AegisCoinBalanceParams) {
  const { t, locale } = useTranslation();
  return (
    <span className="aegis-coins" data-size={size}>
      <img className="aegis-coins__mark" src={COIN_SRC} alt="" width={64} height={64} decoding="async" />
      <b>{coins.toLocaleString(locale)}</b>
      <span>{t("bugForum.coinsLabel")}</span>
      <HelpTip label={t("bugForum.coinsHelpLabel")}>{t("bugForum.coinsHelp")}</HelpTip>
    </span>
  );
}
