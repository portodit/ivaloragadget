import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "id" | "en";
export type Currency = "IDR" | "USD";

interface LocaleContextValue {
  lang: Lang;
  currency: Currency;
  setLang: (l: Lang) => void;
  setCurrency: (c: Currency) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  lang: "id",
  currency: "IDR",
  setLang: () => {},
  setCurrency: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("ivalora_lang") as Lang) ?? "id";
  });
  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem("ivalora_currency") as Currency) ?? "IDR";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("ivalora_lang", l);
  };

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("ivalora_currency", c);
  };

  return (
    <LocaleContext.Provider value={{ lang, currency, setLang, setCurrency }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
