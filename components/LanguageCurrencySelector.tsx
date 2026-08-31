"use client";

// components/LanguageCurrencySelector.tsx — currency conversion is
// real: picking a currency here converts every price shown across the
// site (see CurrencyContext/currencyData.ts) using fixed demo exchange
// rates, one per Deliver-to country (Germany and Italy share EUR).
// Language is still display-only — there's no i18n/translation system
// in this app, so only English is offered rather than listing
// languages that wouldn't actually translate anything.
import { ChevronDown } from "lucide-react";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useCurrency } from "@/context/CurrencyContext";
import { CURRENCIES } from "@/context/currencyData";
import styles from "./LanguageCurrencySelector.module.css";

export default function LanguageCurrencySelector() {
  const { open, toggle, close, triggerRef, panelRef } = useDisclosure();
  const { currency, setCurrencyCode } = useCurrency();

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
      >
        English, {currency.code}
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div ref={panelRef} className={styles.panel} role="menu" aria-label="Choose currency">
          <ul className={styles.list}>
            {CURRENCIES.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={c.code === currency.code}
                  className={`${styles.option} ${c.code === currency.code ? styles.optionActive : ""}`}
                  onClick={() => {
                    setCurrencyCode(c.code);
                    close();
                    triggerRef.current?.focus();
                  }}
                >
                  {c.symbol} {c.code}
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            Demo exchange rates — approximate, not live. Language stays English; this demo doesn&apos;t translate
            content.
          </p>
        </div>
      )}
    </div>
  );
}
