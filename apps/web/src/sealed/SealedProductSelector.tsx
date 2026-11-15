import type { BoosterProduct } from "@aegis/shared/packOpening/BoosterProduct";
import { useId } from "react";
import { boosterProducts } from "@aegis/shared/packOpening/boosterProducts";
import { findBoosterProduct } from "@aegis/shared/packOpening/findBoosterProduct";
import { listSealedProducts } from "@aegis/shared/sealed/listSealedProducts";
import { useTranslation } from "@/i18n/useTranslation";
import "@/sealed/sealed.css";

type Props = { value: string; onChange: (setId: string) => void; disabled?: boolean };

export function SealedProductSelector({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const supported = listSealedProducts();
  const available = new Set(supported.map((product) => product.value));
  const product = findBoosterProduct(value);
  const today = new Date().toISOString().slice(0, 10);
  function describeAvailability(entry: BoosterProduct): string {
    if (entry.releaseDate > today) {
      return t("sealed.product.upcoming", { date: entry.releaseDate });
    }
    return t("sealed.product.unsupported");
  }
  return (
    <section className="sealed-product" aria-label={t("sealed.product.label")}>
      {product ? <img className="sealed-product__art" src={product.coverUrl} alt={product.label} /> : null}
      <div className="sealed-product__details">
        <label className="aegis-field__label" htmlFor={id}>
          {t("sealed.product.label")}
        </label>
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={`${id}-help`}
        >
          {boosterProducts.map((entry) => (
            <option key={entry.value} value={entry.value} disabled={!available.has(entry.value)}>
              {entry.value} · {entry.label}
              {entry.releaseDate > today ? ` · ${t("sealed.product.soon")}` : ""}
              {entry.releaseDate <= today && !available.has(entry.value) ? ` · ${t("sealed.product.unsupported")}` : ""}
            </option>
          ))}
        </select>
        <span id={`${id}-help`} className="sealed-eyebrow">
          {t("sealed.product.packs")}
        </span>
        <details>
          <summary>{t("sealed.product.availability")}</summary>
          {product ? (
            <p>
              {t("sealed.product.region")} · <time dateTime={product.releaseDate}>{product.releaseDate}</time>
            </p>
          ) : null}
          <p>{t("sealed.product.help")}</p>
          <ul>
            {boosterProducts
              .filter((entry) => !available.has(entry.value))
              .map((entry) => (
                <li key={entry.value}>
                  {entry.label} · {describeAvailability(entry)}
                </li>
              ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
