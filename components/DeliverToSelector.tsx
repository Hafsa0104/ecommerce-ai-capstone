"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useShipCountry, SHIP_COUNTRIES } from "@/context/ShipCountryContext";
import { useDisclosure } from "@/hooks/useDisclosure";
import styles from "./DeliverToSelector.module.css";

export default function DeliverToSelector() {
  const { shipCountry, setShipCountry } = useShipCountry();
  const { open, toggle, close, triggerRef, panelRef } = useDisclosure();
  const current = SHIP_COUNTRIES.find((c) => c.value === shipCountry) ?? SHIP_COUNTRIES[0];

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
        <span className={styles.label}>Deliver to</span>
        <Image
          src={current.flag}
          alt=""
          width={current.flagWidth}
          height={current.flagHeight}
          style={{ height: "13px", width: "auto" }}
        />
        <span className={styles.value}>{current.value}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div ref={panelRef} className={styles.panel} role="menu" aria-label="Choose delivery country">
          <ul className={styles.list}>
            {SHIP_COUNTRIES.map((c) => (
              <li key={c.value}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={c.value === shipCountry}
                  className={`${styles.option} ${c.value === shipCountry ? styles.optionActive : ""}`}
                  onClick={() => {
                    setShipCountry(c.value);
                    close();
                    triggerRef.current?.focus();
                  }}
                >
                  <Image
                    src={c.flag}
                    alt=""
                    width={c.flagWidth}
                    height={c.flagHeight}
                    style={{ height: "13px", width: "auto" }}
                  />
                  {c.value}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
