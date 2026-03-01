import { HomeAssistant } from "custom-card-helpers";
import * as af from "./translations/af.json";
import * as ar from "./translations/ar.json";
import * as bg from "./translations/bg.json";
import * as bn from "./translations/bn.json";
import * as bs from "./translations/bs.json";
import * as ca from "./translations/ca.json";
import * as cs from "./translations/cs.json";
import * as cy from "./translations/cy.json";
import * as da from "./translations/da.json";
import * as de from "./translations/de.json";
import * as el from "./translations/el.json";
import * as en from "./translations/en.json";
import * as enGB from "./translations/en-GB.json";
import * as eo from "./translations/eo.json";
import * as es from "./translations/es.json";
import * as es419 from "./translations/es-419.json";
import * as et from "./translations/et.json";
import * as eu from "./translations/eu.json";
import * as fa from "./translations/fa.json";
import * as fi from "./translations/fi.json";
import * as fr from "./translations/fr.json";
import * as fy from "./translations/fy.json";
import * as ga from "./translations/ga.json";
import * as gl from "./translations/gl.json";
import * as gsw from "./translations/gsw.json";
import * as he from "./translations/he.json";
import * as hi from "./translations/hi.json";
import * as hr from "./translations/hr.json";
import * as hu from "./translations/hu.json";
import * as hy from "./translations/hy.json";
import * as id from "./translations/id.json";
import * as is_ from "./translations/is.json";
import * as it from "./translations/it.json";
import * as ja from "./translations/ja.json";
import * as ka from "./translations/ka.json";
import * as ko from "./translations/ko.json";
import * as lb from "./translations/lb.json";
import * as lt from "./translations/lt.json";
import * as lv from "./translations/lv.json";
import * as mk from "./translations/mk.json";
import * as ml from "./translations/ml.json";
import * as nb from "./translations/nb.json";
import * as nl from "./translations/nl.json";
import * as nn from "./translations/nn.json";
import * as pl from "./translations/pl.json";
import * as pt from "./translations/pt.json";
import * as ptBR from "./translations/pt-BR.json";
import * as ro from "./translations/ro.json";
import * as ru from "./translations/ru.json";
import * as sk from "./translations/sk.json";
import * as sl from "./translations/sl.json";
import * as sq from "./translations/sq.json";
import * as sr from "./translations/sr.json";
import * as srLatn from "./translations/sr-Latn.json";
import * as sv from "./translations/sv.json";
import * as ta from "./translations/ta.json";
import * as te from "./translations/te.json";
import * as th from "./translations/th.json";
import * as tr from "./translations/tr.json";
import * as uk from "./translations/uk.json";
import * as ur from "./translations/ur.json";
import * as vi from "./translations/vi.json";
import * as zhHans from "./translations/zh-Hans.json";
import * as zhHant from "./translations/zh-Hant.json";

const languages: Record<string, unknown> = {
  af,
  ar,
  bg,
  bn,
  bs,
  ca,
  cs,
  cy,
  da,
  de,
  el,
  en,
  "en-GB": enGB,
  eo,
  es,
  "es-419": es419,
  et,
  eu,
  fa,
  fi,
  fr,
  fy,
  ga,
  gl,
  gsw,
  he,
  hi,
  hr,
  hu,
  hy,
  id,
  is: is_,
  it,
  ja,
  ka,
  ko,
  lb,
  lt,
  lv,
  mk,
  ml,
  nb,
  nl,
  nn,
  pl,
  pt,
  "pt-BR": ptBR,
  ro,
  ru,
  sk,
  sl,
  sq,
  sr,
  "sr-Latn": srLatn,
  sv,
  ta,
  te,
  th,
  tr,
  uk,
  ur,
  vi,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};

const DEFAULT_LANG = "en";

function getTranslatedString(key: string, lang: string): string | undefined {
  try {
    return key
      .split(".")
      .reduce(
        (o, i) => (o as Record<string, unknown>)[i],
        languages[lang]
      ) as string;
  } catch {
    return undefined;
  }
}

export default function setupCustomLocalize(hass?: HomeAssistant) {
  return function (key: string): string {
    const lang = hass?.locale?.language ?? DEFAULT_LANG;

    let translated = getTranslatedString(key, lang);
    if (!translated) {
      translated = getTranslatedString(key, DEFAULT_LANG);
    }

    return translated ?? key;
  };
}
