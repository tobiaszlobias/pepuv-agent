export const QUICK_PROMPTS = [
  { label: "Noví klienti Q1", prompt: "Jaké nové klienty máme za 1. kvartál? Odkud přišli? Můžeš to znázornit graficky?" },
  { label: "Vývoj leadů a prodejů", prompt: "Vytvoř graf vývoje počtu leadů a prodaných nemovitostí za posledních 6 měsíců." },
  { label: "Email zájemci", prompt: "Napiš e-mail pro Jana Nováka, který má zájem o byt na Náměstí Míru 5, Praha. Doporuč mu termín prohlídky na základě mé aktuální dostupnosti v kalendáři." },
  { label: "Chybějící rekonstrukce", prompt: "Najdi nemovitosti, u kterých nám v systému chybí data o rekonstrukci a stavebních úpravách a připrav jejich seznam k doplnění." },
  { label: "Týdenní report", prompt: "Shrň výsledky tohoto pracovního týdne (týden 20, 11.–16. května 2026) do krátkého reportu pro vedení a připrav k tomu prezentaci se třemi slidy." },
  { label: "Sreality Holešovice", prompt: "Ukáž mi aktuální nabídky bytů na Sreality v lokalitě Praha Holešovice a ověř jejich katastr." },
  { label: "Kdy mám volno?", prompt: "Kdy mám volno tento týden? Ukaž mi volné termíny z mého kalendáře." },
] as const;

export const MODEL_TIMEOUTS: Record<string, number> = {
  "claude-haiku-4-5-20251001": 45_000,
  "claude-sonnet-4-6": 90_000,
  "claude-opus-4-7": 150_000,
};
