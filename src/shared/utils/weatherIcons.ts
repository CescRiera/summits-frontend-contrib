import {
  DEFAULT_LANGUAGE,
  getIntlLocale,
  isAppLanguage,
  type AppLanguageCode,
} from "../i18n/languages";

export interface WeatherIconInfo {
  icon: string;
  description: string;
}

export type SupportedLanguage = AppLanguageCode;

export const WEATHER_ICONS: Record<
  string,
  { day: string; night: string; iday: string }
> = {
  "10": {
    "day": "10_day.svg",
    "night": "10_night.svg",
    "iday": "10_iday.svg"
  },
  "11": {
    "day": "11_day.svg",
    "night": "11_night.svg",
    "iday": "11_iday.svg"
  },
  "12": {
    "day": "12_day.svg",
    "night": "12_night.svg",
    "iday": "12_iday.svg"
  },
  "13": {
    "day": "13_day.svg",
    "night": "13_night.svg",
    "iday": "13_iday.svg"
  },
  "14": {
    "day": "14_day.svg",
    "night": "14_night.svg",
    "iday": "14_iday.svg"
  },
  "15": {
    "day": "15_day.svg",
    "night": "15_night.svg",
    "iday": "15_iday.svg"
  },
  "16": {
    "day": "16_day.svg",
    "night": "16_night.svg",
    "iday": "16_iday.svg"
  },
  "17": {
    "day": "17_day.svg",
    "night": "17_night.svg",
    "iday": "17_iday.svg"
  },
  "18": {
    "day": "18_day.svg",
    "night": "18_night.svg",
    "iday": "18_iday.svg"
  },
  "19": {
    "day": "19_day.svg",
    "night": "19_night.svg",
    "iday": "19_iday.svg"
  },
  "20": {
    "day": "20_day.svg",
    "night": "20_night.svg",
    "iday": "20_day.svg"
  },
  "21": {
    "day": "21_day.svg",
    "night": "21_night.svg",
    "iday": "21_day.svg"
  },
  "22": {
    "day": "22_day.svg",
    "night": "22_night.svg",
    "iday": "22_day.svg"
  },
  "23": {
    "day": "23_day.svg",
    "night": "23_night.svg",
    "iday": "23_day.svg"
  },
  "24": {
    "day": "24_day.svg",
    "night": "24_night.svg",
    "iday": "24_day.svg"
  },
  "25": {
    "day": "25_day.svg",
    "night": "25_night.svg",
    "iday": "25_day.svg"
  },
  "26": {
    "day": "26_day.svg",
    "night": "26_night.svg",
    "iday": "26_day.svg"
  },
  "27": {
    "day": "27_day.svg",
    "night": "27_night.svg",
    "iday": "27_day.svg"
  },
  "28": {
    "day": "28_day.svg",
    "night": "28_night.svg",
    "iday": "28_day.svg"
  },
  "29": {
    "day": "29_day.svg",
    "night": "29_night.svg",
    "iday": "29_day.svg"
  },
  "30": {
    "day": "30_day.svg",
    "night": "30_night.svg",
    "iday": "30_day.svg"
  },
  "31": {
    "day": "31_day.svg",
    "night": "31_night.svg",
    "iday": "31_day.svg"
  },
  "32": {
    "day": "32_day.svg",
    "night": "32_night.svg",
    "iday": "32_day.svg"
  },
  "33": {
    "day": "33_day.svg",
    "night": "33_night.svg",
    "iday": "33_day.svg"
  },
  "34": {
    "day": "34_day.svg",
    "night": "34_night.svg",
    "iday": "34_day.svg"
  },
  "35": {
    "day": "35_day.svg",
    "night": "35_night.svg",
    "iday": "35_day.svg"
  },
  "01": {
    "day": "01_day.svg",
    "night": "01_night.svg",
    "iday": "01_iday.svg"
  },
  "02": {
    "day": "02_day.svg",
    "night": "02_night.svg",
    "iday": "02_iday.svg"
  },
  "03": {
    "day": "03_day.svg",
    "night": "03_night.svg",
    "iday": "03_iday.svg"
  },
  "04": {
    "day": "04_day.svg",
    "night": "04_night.svg",
    "iday": "04_iday.svg"
  },
  "05": {
    "day": "05_day.svg",
    "night": "05_night.svg",
    "iday": "05_iday.svg"
  },
  "06": {
    "day": "06_day.svg",
    "night": "06_night.svg",
    "iday": "06_iday.svg"
  },
  "07": {
    "day": "07_day.svg",
    "night": "07_night.svg",
    "iday": "07_iday.svg"
  },
  "08": {
    "day": "08_day.svg",
    "night": "08_night.svg",
    "iday": "08_iday.svg"
  },
  "09": {
    "day": "09_day.svg",
    "night": "09_night.svg",
    "iday": "09_iday.svg"
  }
};

export const WEATHER_DESCRIPTIONS: Record<
  AppLanguageCode,
  Record<string, { day: string; night: string; iday: string }>
> = {
  "en": {
    "10": {
      "day": "Mixed with some thunderstorm clouds possible",
      "night": "Mixed with some thunderstorm clouds possible",
      "iday": "Mixed with snow showers"
    },
    "11": {
      "day": "Mixed with few cirrus with some thunderstorm clouds possible",
      "night": "Mixed with few cirrus with some thunderstorm clouds possible",
      "iday": "Mostly cloudy with a mixture of snow and rain"
    },
    "12": {
      "day": "Mixed with cirrus with some thunderstorm clouds possible",
      "night": "Mixed with cirrus with some thunderstorm clouds possible",
      "iday": "Overcast with light rain"
    },
    "13": {
      "day": "Clear but hazy",
      "night": "Clear but hazy",
      "iday": "Overcast with light snow"
    },
    "14": {
      "day": "Clear but hazy with few cirrus",
      "night": "Clear but hazy with few cirrus",
      "iday": "Mostly cloudy with rain"
    },
    "15": {
      "day": "Clear but hazy with cirrus",
      "night": "Clear but hazy with cirrus",
      "iday": "Mostly cloudy with snow"
    },
    "16": {
      "day": "Fog/low stratus clouds",
      "night": "Fog/low stratus clouds",
      "iday": "Mostly cloudy with light rain"
    },
    "17": {
      "day": "Fog/low stratus clouds with few cirrus",
      "night": "Fog/low stratus clouds with few cirrus",
      "iday": "Mostly cloudy with light snow"
    },
    "18": {
      "day": "Fog/low stratus clouds with cirrus",
      "night": "Fog/low stratus clouds with cirrus",
      "iday": "Mostly cloudy with light rain"
    },
    "19": {
      "day": "Mostly cloudy",
      "night": "Mostly cloudy",
      "iday": "Mostly cloudy with light rain"
    },
    "20": {
      "day": "Mostly cloudy and few cirrus",
      "night": "Mostly cloudy and few cirrus",
      "iday": "Mostly cloudy with light rain"
    },
    "21": {
      "day": "Mostly cloudy and cirrus",
      "night": "Mostly cloudy and cirrus",
      "iday": "Mostly cloudy with light rain"
    },
    "22": {
      "day": "Overcast",
      "night": "Overcast",
      "iday": "Mostly cloudy with light rain"
    },
    "23": {
      "day": "Overcast with rain",
      "night": "Overcast with rain",
      "iday": "Mostly cloudy with light rain"
    },
    "24": {
      "day": "Overcast with snow",
      "night": "Overcast with snow",
      "iday": "Mostly cloudy with light rain"
    },
    "25": {
      "day": "Overcast with heavy rain",
      "night": "Overcast with heavy rain",
      "iday": "Mostly cloudy with light rain"
    },
    "26": {
      "day": "Overcast with heavy snow",
      "night": "Overcast with heavy snow",
      "iday": "Mostly cloudy with light rain"
    },
    "27": {
      "day": "Rain, thunderstorms likely",
      "night": "Rain, thunderstorms likely",
      "iday": "Mostly cloudy with light rain"
    },
    "28": {
      "day": "Light rain, thunderstorms likely",
      "night": "Light rain, thunderstorms likely",
      "iday": "Mostly cloudy with light rain"
    },
    "29": {
      "day": "Storm with heavy snow",
      "night": "Storm with heavy snow",
      "iday": "Mostly cloudy with light rain"
    },
    "30": {
      "day": "Heavy rain, thunderstorms likely",
      "night": "Heavy rain, thunderstorms likely",
      "iday": "Mostly cloudy with light rain"
    },
    "31": {
      "day": "Mixed with showers",
      "night": "Mixed with showers",
      "iday": "Mostly cloudy with light rain"
    },
    "32": {
      "day": "Mixed with snow showers",
      "night": "Mixed with snow showers",
      "iday": "Mostly cloudy with light rain"
    },
    "33": {
      "day": "Overcast with light rain",
      "night": "Overcast with light rain",
      "iday": "Mostly cloudy with light rain"
    },
    "34": {
      "day": "Overcast with light snow",
      "night": "Overcast with light snow",
      "iday": "Mostly cloudy with light rain"
    },
    "35": {
      "day": "Overcast with mixture of snow and rain",
      "night": "Overcast with mixture of snow and rain",
      "iday": "Mostly cloudy with light rain"
    },
    "01": {
      "day": "Clear, cloudless sky",
      "night": "Clear, cloudless sky",
      "iday": "Clear, cloudless sky"
    },
    "02": {
      "day": "Clear, few cirrus",
      "night": "Clear, few cirrus",
      "iday": "Clear and few clouds"
    },
    "03": {
      "day": "Clear with cirrus",
      "night": "Clear with cirrus",
      "iday": "Partly cloudy"
    },
    "04": {
      "day": "Clear with few low clouds",
      "night": "Clear with few low clouds",
      "iday": "Overcast"
    },
    "05": {
      "day": "Clear with few low clouds and few cirrus",
      "night": "Clear with few low clouds and few cirrus",
      "iday": "Fog"
    },
    "06": {
      "day": "Clear with few low clouds and cirrus",
      "night": "Clear with few low clouds and cirrus",
      "iday": "Overcast with rain"
    },
    "07": {
      "day": "Partly cloudy",
      "night": "Partly cloudy",
      "iday": "Mixed with showers"
    },
    "08": {
      "day": "Partly cloudy and few cirrus",
      "night": "Partly cloudy and few cirrus",
      "iday": "Showers, thunderstorms likely"
    },
    "09": {
      "day": "Partly cloudy and cirrus",
      "night": "Partly cloudy and cirrus",
      "iday": "Overcast with snow"
    }
  },
  "es": {
    "10": {
      "day": "Posible aparición de algunas nubes de tormenta",
      "night": "Posible aparición de algunas nubes de tormenta",
      "iday": "Variable con nieve"
    },
    "11": {
      "day": "Posibilidad de algunas nubes cirrus y algunas nubes de tormenta",
      "night": "Posibilidad de algunas nubes cirrus y algunas nubes de tormenta",
      "iday": "Mayormente nublado con mixto de nieve y lluvia"
    },
    "12": {
      "day": "Mixto con cirrus con algunas nubes de tormenta posibles",
      "night": "Mixto con cirrus con algunas nubes de tormenta posibles",
      "iday": "Nublado con lluvia ligera"
    },
    "13": {
      "day": "Limpio, pero nebuloso",
      "night": "Limpio, pero nebuloso",
      "iday": "Nublado con nieve ligera"
    },
    "14": {
      "day": "Limpio, pero nebuloso con algunos cirros",
      "night": "Limpio, pero nebuloso con algunos cirros",
      "iday": "Mayormente nublado con lluvia"
    },
    "15": {
      "day": "Limpio, pero nebuloso con cirros",
      "night": "Limpio, pero nebuloso con cirros",
      "iday": "Mayormente nublado con nieve"
    },
    "16": {
      "day": "Niebla/nubes estratos bajas",
      "night": "Niebla/nubes estratos bajas",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "17": {
      "day": "Niebla/nubes estratos bajas con algunos cirros",
      "night": "Niebla/nubes estratos bajas con algunos cirros",
      "iday": "Mayormente nublado con nieve ligera"
    },
    "18": {
      "day": "Niebla/nubes estratos bajas con cirros",
      "night": "Niebla/nubes estratos bajas con cirros",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "19": {
      "day": "Mayormente nublado",
      "night": "Mayormente nublado",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "20": {
      "day": "Mayormente nublado y algunos cirros",
      "night": "Mayormente nublado y algunos cirros",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "21": {
      "day": "Mayormente nublado y cirros",
      "night": "Mayormente nublado y cirros",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "22": {
      "day": "Nublado",
      "night": "Nublado",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "23": {
      "day": "Nublado con lluvia",
      "night": "Nublado con lluvia",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "24": {
      "day": "Nublado con nieve",
      "night": "Nublado con nieve",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "25": {
      "day": "Nublado con lluvia fuerte",
      "night": "Nublado con lluvia fuerte",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "26": {
      "day": "Nublado con fuertes nevadas",
      "night": "Nublado con fuertes nevadas",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "27": {
      "day": "Lluvia, tormentas probables",
      "night": "Lluvia, tormentas probables",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "28": {
      "day": "Lluvia ligera, tormentas probables",
      "night": "Lluvia ligera, tormentas probables",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "29": {
      "day": "Tormenta con fuertes nevadas",
      "night": "Tormenta con fuertes nevadas",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "30": {
      "day": "Fuertes lluvias, tormentas probables",
      "night": "Fuertes lluvias, tormentas probables",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "31": {
      "day": "Mixto con llovizna",
      "night": "Mixto con llovizna",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "32": {
      "day": "Variable con nieve",
      "night": "Variable con nieve",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "33": {
      "day": "Nublado con lluvia ligera",
      "night": "Nublado con lluvia ligera",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "34": {
      "day": "Nublado con nieve ligera",
      "night": "Nublado con nieve ligera",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "35": {
      "day": "Nublado con mixto de nieve y lluvia",
      "night": "Nublado con mixto de nieve y lluvia",
      "iday": "Mayormente nublado con lluvias débiles"
    },
    "01": {
      "day": "Limpio, sin nubes",
      "night": "Limpio, sin nubes",
      "iday": "Limpio, sin nubes"
    },
    "02": {
      "day": "Limpio, algunas nubes cirrus",
      "night": "Limpio, algunas nubes cirrus",
      "iday": "Limpio y algunas nubes"
    },
    "03": {
      "day": "Limpio, con nubes cirrus",
      "night": "Limpio, con nubes cirrus",
      "iday": "Parcialmente nublado"
    },
    "04": {
      "day": "Limpio, con algunas nubes bajas",
      "night": "Limpio, con algunas nubes bajas",
      "iday": "Nublado"
    },
    "05": {
      "day": "Limpio, con algunas nubes bajas y algunas cirrus",
      "night": "Limpio, con algunas nubes bajas y algunas cirrus",
      "iday": "Niebla"
    },
    "06": {
      "day": "Limpio, con algunas nubes bajas y cirrus",
      "night": "Limpio, con algunas nubes bajas y cirrus",
      "iday": "Nublado con lluvia"
    },
    "07": {
      "day": "Parcialmente nublado",
      "night": "Parcialmente nublado",
      "iday": "Mixto con llovizna"
    },
    "08": {
      "day": "Parcialmente nublado y algunas nubes cirrus",
      "night": "Parcialmente nublado y algunas nubes cirrus",
      "iday": "Llovizna, tormentas probables"
    },
    "09": {
      "day": "Parcialmente nublado y nubes cirrus",
      "night": "Parcialmente nublado y nubes cirrus",
      "iday": "Nublado con nieve"
    }
  },
  "ca": {
    "10": {
      "day": "Possible aparició d'alguns núvols de tempesta",
      "night": "Possible aparició d'alguns núvols de tempesta",
      "iday": "Variable amb neu"
    },
    "11": {
      "day": "Possibilitat d'alguns núvols cirrus i alguns núvols de tempesta",
      "night": "Possibilitat d'alguns núvols cirrus i alguns núvols de tempesta",
      "iday": "Majoritàriament ennuvolat amb mixt de neu i pluja"
    },
    "12": {
      "day": "Mixt amb cirrus amb alguns núvols de tempesta possibles",
      "night": "Mixt amb cirrus amb alguns núvols de tempesta possibles",
      "iday": "Ennuvolat amb pluja lleugera"
    },
    "13": {
      "day": "Net, però boirós",
      "night": "Net, però boirós",
      "iday": "Ennuvolat amb neu lleugera"
    },
    "14": {
      "day": "Net, però boirós amb alguns cirrus",
      "night": "Net, però boirós amb alguns cirrus",
      "iday": "Majoritàriament ennuvolat amb pluja"
    },
    "15": {
      "day": "Net, però boirós amb cirrus",
      "night": "Net, però boirós amb cirrus",
      "iday": "Majoritàriament ennuvolat amb neu"
    },
    "16": {
      "day": "Boira/núvols estratos baixos",
      "night": "Boira/núvols estratos baixos",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "17": {
      "day": "Boira/núvols estratos baixos amb alguns cirrus",
      "night": "Boira/núvols estratos baixos amb alguns cirrus",
      "iday": "Majoritàriament ennuvolat amb neu lleugera"
    },
    "18": {
      "day": "Boira/núvols estratos baixos amb cirrus",
      "night": "Boira/núvols estratos baixos amb cirrus",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "19": {
      "day": "Majoritàriament ennuvolat",
      "night": "Majoritàriament ennuvolat",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "20": {
      "day": "Majoritàriament ennuvolat i alguns cirrus",
      "night": "Majoritàriament ennuvolat i alguns cirrus",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "21": {
      "day": "Majoritàriament ennuvolat i cirrus",
      "night": "Majoritàriament ennuvolat i cirrus",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "22": {
      "day": "Ennuvolat",
      "night": "Ennuvolat",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "23": {
      "day": "Ennuvolat amb pluja",
      "night": "Ennuvolat amb pluja",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "24": {
      "day": "Ennuvolat amb neu",
      "night": "Ennuvolat amb neu",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "25": {
      "day": "Ennuvolat amb pluja forta",
      "night": "Ennuvolat amb pluja forta",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "26": {
      "day": "Ennuvolat amb fortes nevades",
      "night": "Ennuvolat amb fortes nevades",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "27": {
      "day": "Pluja, tempestes probables",
      "night": "Pluja, tempestes probables",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "28": {
      "day": "Pluja lleugera, tempestes probables",
      "night": "Pluja lleugera, tempestes probables",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "29": {
      "day": "Tempesta amb fortes nevades",
      "night": "Tempesta amb fortes nevades",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "30": {
      "day": "Fortes pluges, tempestes probables",
      "night": "Fortes pluges, tempestes probables",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "31": {
      "day": "Mixt amb plugim",
      "night": "Mixt amb plugim",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "32": {
      "day": "Variable amb neu",
      "night": "Variable amb neu",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "33": {
      "day": "Ennuvolat amb pluja lleugera",
      "night": "Ennuvolat amb pluja lleugera",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "34": {
      "day": "Ennuvolat amb neu lleugera",
      "night": "Ennuvolat amb neu lleugera",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "35": {
      "day": "Ennuvolat amb mixt de neu i pluja",
      "night": "Ennuvolat amb mixt de neu i pluja",
      "iday": "Majoritàriament ennuvolat amb pluges dèbils"
    },
    "01": {
      "day": "Net, sense núvols",
      "night": "Net, sense núvols",
      "iday": "Net, sense núvols"
    },
    "02": {
      "day": "Net, alguns núvols cirrus",
      "night": "Net, alguns núvols cirrus",
      "iday": "Net i alguns núvols"
    },
    "03": {
      "day": "Net, amb núvols cirrus",
      "night": "Net, amb núvols cirrus",
      "iday": "Parcialment ennuvolat"
    },
    "04": {
      "day": "Net, amb alguns núvols baixos",
      "night": "Net, amb alguns núvols baixos",
      "iday": "Ennuvolat"
    },
    "05": {
      "day": "Net, amb alguns núvols baixos i alguns cirrus",
      "night": "Net, amb alguns núvols baixos i alguns cirrus",
      "iday": "Boira"
    },
    "06": {
      "day": "Net, amb alguns núvols baixos i cirrus",
      "night": "Net, amb alguns núvols baixos i cirrus",
      "iday": "Ennuvolat amb pluja"
    },
    "07": {
      "day": "Parcialment ennuvolat",
      "night": "Parcialment ennuvolat",
      "iday": "Mixt amb plugim"
    },
    "08": {
      "day": "Parcialment ennuvolat i alguns núvols cirrus",
      "night": "Parcialment ennuvolat i alguns núvols cirrus",
      "iday": "Plugim, tempestes probables"
    },
    "09": {
      "day": "Parcialment ennuvolat i núvols cirrus",
      "night": "Parcialment ennuvolat i núvols cirrus",
      "iday": "Ennuvolat amb neu"
    }
  },
  "fr": {
    "10": {
      "day": "Variable avec orages possibles",
      "night": "Variable avec orages possibles",
      "iday": "Ciel variable avec des averses de neige"
    },
    "11": {
      "day": "Variable avec quelques cirrus et orages possible",
      "night": "Variable avec quelques cirrus et orages possible",
      "iday": "Partiellement nuageux avec mélange de neige et de pluie"
    },
    "12": {
      "day": "Variable avec cirrus et orages possibles",
      "night": "Variable avec cirrus et orages possibles",
      "iday": "Couvert avec pluie légère"
    },
    "13": {
      "day": "Ciel clair mais brumeux",
      "night": "Ciel clair mais brumeux",
      "iday": "Couvert avec neige légère"
    },
    "14": {
      "day": "Ciel clair mais brumeux avec quelques cirrus",
      "night": "Ciel clair mais brumeux avec quelques cirrus",
      "iday": "Partiellement nuageux avec pluie"
    },
    "15": {
      "day": "Ciel clair mais brumeux avec cirrus",
      "night": "Ciel clair mais brumeux avec cirrus",
      "iday": "Partiellement nuageux avec neige"
    },
    "16": {
      "day": "Brouillard/Stratus bas",
      "night": "Brouillard/Stratus bas",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "17": {
      "day": "Brouillard/Stratus bas avec quelques cirrus",
      "night": "Brouillard/Stratus bas avec quelques cirrus",
      "iday": "Partiellement nuageux avec chutes de neiges éparses"
    },
    "18": {
      "day": "Brouillard/Stratus bas avec cirrus",
      "night": "Brouillard/Stratus bas avec cirrus",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "19": {
      "day": "Partiellement nuageux",
      "night": "Partiellement nuageux",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "20": {
      "day": "Partiellement nuageux avec quelques cirrus",
      "night": "Partiellement nuageux avec quelques cirrus",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "21": {
      "day": "Partiellement nuageux avec quelques cirrus",
      "night": "Partiellement nuageux avec quelques cirrus",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "22": {
      "day": "Ciel couvert",
      "night": "Ciel couvert",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "23": {
      "day": "Couvert avec pluie",
      "night": "Couvert avec pluie",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "24": {
      "day": "Couvert avec chutes de neige",
      "night": "Couvert avec chutes de neige",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "25": {
      "day": "Couvert avec fortes pluies",
      "night": "Couvert avec fortes pluies",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "26": {
      "day": "Couvert avec fortes chutes de neige",
      "night": "Couvert avec fortes chutes de neige",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "27": {
      "day": "Pluie, orages probables",
      "night": "Pluie, orages probables",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "28": {
      "day": "Pluies éparses, orages probables",
      "night": "Pluies éparses, orages probables",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "29": {
      "day": "Tempête avec fortes chutes de neige",
      "night": "Tempête avec fortes chutes de neige",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "30": {
      "day": "Fortes pluies, orages probables",
      "night": "Fortes pluies, orages probables",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "31": {
      "day": "Variable avec risques d'averses",
      "night": "Variable avec risques d'averses",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "32": {
      "day": "Ciel variable avec des averses de neige",
      "night": "Ciel variable avec des averses de neige",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "33": {
      "day": "Couvert avec pluie légère",
      "night": "Couvert avec pluie légère",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "34": {
      "day": "Couvert avec neige légère",
      "night": "Couvert avec neige légère",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "35": {
      "day": "Couvert avec un mélange de pluie et neige",
      "night": "Couvert avec un mélange de pluie et neige",
      "iday": "Partiellement nuageux avec pluies éparses"
    },
    "01": {
      "day": "Clair, ciel sans nuage",
      "night": "Clair, ciel sans nuage",
      "iday": "Clair, ciel sans nuage"
    },
    "02": {
      "day": "Clair, quelques cirrus",
      "night": "Clair, quelques cirrus",
      "iday": "Clair avec quelques nuages"
    },
    "03": {
      "day": "Clair avec cirrus",
      "night": "Clair avec cirrus",
      "iday": "Partiellement nuageux"
    },
    "04": {
      "day": "Clair avec quelques nuages bas",
      "night": "Clair avec quelques nuages bas",
      "iday": "Ciel couvert"
    },
    "05": {
      "day": "Clair avec quelques nuages bas et quelques cirrus",
      "night": "Clair avec quelques nuages bas et quelques cirrus",
      "iday": "Brouillard"
    },
    "06": {
      "day": "Clair avec quelques nuages bas et cirrus",
      "night": "Clair avec quelques nuages bas et cirrus",
      "iday": "Couvert avec pluie"
    },
    "07": {
      "day": "Partiellement nuageux",
      "night": "Partiellement nuageux",
      "iday": "Variable avec risques d'averses"
    },
    "08": {
      "day": "Partiellement nuageux et quelques cirrus",
      "night": "Partiellement nuageux et quelques cirrus",
      "iday": "Averses avec orages probables"
    },
    "09": {
      "day": "Partiellement nuageux et cirrus",
      "night": "Partiellement nuageux et cirrus",
      "iday": "Couvert avec chutes de neige"
    }
  },
  "it": {
    "10": {
      "day": "Variabile con nubi cumuliformi",
      "night": "Variabile con nubi cumuliformi",
      "iday": "Variabile con rovesci di neve"
    },
    "11": {
      "day": "Variabile con nubi cumuliformi",
      "night": "Variabile con nubi cumuliformi",
      "iday": "Molto nuvoloso con pioggia mista a neve"
    },
    "12": {
      "day": "Variabile con possibili temporali",
      "night": "Variabile con possibili temporali",
      "iday": "Coperto con pioggia leggera"
    },
    "13": {
      "day": "Sereno con foschia",
      "night": "Sereno con foschia",
      "iday": "Coperto con neve debole"
    },
    "14": {
      "day": "Sereno con velature, foschia",
      "night": "Sereno con velature, foschia",
      "iday": "Molto nuvoloso con pioggia"
    },
    "15": {
      "day": "Sereno con velature, foschia",
      "night": "Sereno con velature, foschia",
      "iday": "Molto nuvoloso con neve"
    },
    "16": {
      "day": "Nebbia o nubi basse",
      "night": "Nebbia o nubi basse",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "17": {
      "day": "Nebbia o nubi basse con velature leggere",
      "night": "Nebbia o nubi basse con velature leggere",
      "iday": "Molto nuvoloso con neve debole"
    },
    "18": {
      "day": "Nebbia o nubi basse con velature",
      "night": "Nebbia o nubi basse con velature",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "19": {
      "day": "Molto nuvoloso",
      "night": "Molto nuvoloso",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "20": {
      "day": "Molto nuvoloso con velature",
      "night": "Molto nuvoloso con velature",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "21": {
      "day": "Molto nuvoloso con velature",
      "night": "Molto nuvoloso con velature",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "22": {
      "day": "Coperto",
      "night": "Coperto",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "23": {
      "day": "Coperto con pioggia",
      "night": "Coperto con pioggia",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "24": {
      "day": "Coperto con neve",
      "night": "Coperto con neve",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "25": {
      "day": "Coperto con pioggia forte",
      "night": "Coperto con pioggia forte",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "26": {
      "day": "Coperto con neve forte",
      "night": "Coperto con neve forte",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "27": {
      "day": "Temporale",
      "night": "Temporale",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "28": {
      "day": "Temporale debole",
      "night": "Temporale debole",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "29": {
      "day": "Temporale con neve forte",
      "night": "Temporale con neve forte",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "30": {
      "day": "Temporale forte",
      "night": "Temporale forte",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "31": {
      "day": "Variabile con rovesci",
      "night": "Variabile con rovesci",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "32": {
      "day": "Variabile con rovesci di neve",
      "night": "Variabile con rovesci di neve",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "33": {
      "day": "Coperto con pioggia leggera",
      "night": "Coperto con pioggia leggera",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "34": {
      "day": "Coperto con neve debole",
      "night": "Coperto con neve debole",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "35": {
      "day": "Coperto con pioggia mista a neve",
      "night": "Coperto con pioggia mista a neve",
      "iday": "Molto nuvoloso con pioggia debole"
    },
    "01": {
      "day": "Sereno",
      "night": "Sereno",
      "iday": "Sereno"
    },
    "02": {
      "day": "Sereno con velature",
      "night": "Sereno con velature",
      "iday": "Sereno con velature"
    },
    "03": {
      "day": "Sereno con stratificazioni",
      "night": "Sereno con stratificazioni",
      "iday": "Parzialmente nuvoloso"
    },
    "04": {
      "day": "Poco nuvoloso",
      "night": "Poco nuvoloso",
      "iday": "Coperto"
    },
    "05": {
      "day": "Parzialmente nuvoloso",
      "night": "Parzialmente nuvoloso",
      "iday": "Nebbia"
    },
    "06": {
      "day": "Parzialmente nuvoloso",
      "night": "Parzialmente nuvoloso",
      "iday": "Coperto con neve"
    },
    "07": {
      "day": "Variabile",
      "night": "Variabile",
      "iday": "Variabile con rovesci"
    },
    "08": {
      "day": "Variabile",
      "night": "Variabile",
      "iday": "Rovesci temporaleschi"
    },
    "09": {
      "day": "Variabile",
      "night": "Variabile",
      "iday": "Coperto con neve"
    }
  },
  "de": {
    "10": {
      "day": "Gemischt mit einigen Gewitterwolken möglich",
      "night": "Gemischt mit einigen Gewitterwolken möglich",
      "iday": "Gemischt mit Schneeschauern"
    },
    "11": {
      "day": "Gemischt mit wenigen Cirruswolken, einige Gewitterwolken möglich",
      "night": "Gemischt mit wenigen Cirruswolken, einige Gewitterwolken möglich",
      "iday": "Meist bewölkt mit einer Mischung aus Schnee und Regen"
    },
    "12": {
      "day": "Gemischt mit Cirruswolken, einige Gewitterwolken möglich",
      "night": "Gemischt mit Cirruswolken, einige Gewitterwolken möglich",
      "iday": "Bedeckt mit leichtem Regen"
    },
    "13": {
      "day": "Klar, aber verschwommen",
      "night": "Klar, aber verschwommen",
      "iday": "Bedeckt mit leichtem Schneefall"
    },
    "14": {
      "day": "Klar, aber dunstig mit wenigen Zirruswolken",
      "night": "Klar, aber dunstig mit wenigen Zirruswolken",
      "iday": "Meist bewölkt mit Regen"
    },
    "15": {
      "day": "Klar, aber dunstig mit Zirrus",
      "night": "Klar, aber dunstig mit Zirrus",
      "iday": "Meist bewölkt mit Schnee"
    },
    "16": {
      "day": "Nebel/niedrige Stratuswolken",
      "night": "Nebel/niedrige Stratuswolken",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "17": {
      "day": "Nebel/niedrige Stratuswolken mit wenigen Zirruswolken",
      "night": "Nebel/niedrige Stratuswolken mit wenigen Zirruswolken",
      "iday": "Meist bewölkt mit leichtem Schneefall"
    },
    "18": {
      "day": "Nebel/niedrige Stratuswolken mit Zirrus",
      "night": "Nebel/niedrige Stratuswolken mit Zirrus",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "19": {
      "day": "Größtenteils bewölkt",
      "night": "Größtenteils bewölkt",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "20": {
      "day": "Meistens bewölkt und wenige Zirruswolken",
      "night": "Meistens bewölkt und wenige Zirruswolken",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "21": {
      "day": "Meist bewölkt und Zirrus",
      "night": "Meist bewölkt und Zirrus",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "22": {
      "day": "Bedeckt",
      "night": "Bedeckt",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "23": {
      "day": "Bedeckt mit Regen",
      "night": "Bedeckt mit Regen",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "24": {
      "day": "Bedeckt mit Schnee",
      "night": "Bedeckt mit Schnee",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "25": {
      "day": "Bedeckt mit starkem Regen",
      "night": "Bedeckt mit starkem Regen",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "26": {
      "day": "Bedeckt mit starkem Schneefall",
      "night": "Bedeckt mit starkem Schneefall",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "27": {
      "day": "Regen, Gewitter wahrscheinlich",
      "night": "Regen, Gewitter wahrscheinlich",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "28": {
      "day": "Leichter Regen, Gewitter wahrscheinlich",
      "night": "Leichter Regen, Gewitter wahrscheinlich",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "29": {
      "day": "Sturm mit starkem Schneefall",
      "night": "Sturm mit starkem Schneefall",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "30": {
      "day": "Starker Regen, Gewitter wahrscheinlich",
      "night": "Starker Regen, Gewitter wahrscheinlich",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "31": {
      "day": "Gemischt mit Schauern",
      "night": "Gemischt mit Schauern",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "32": {
      "day": "Gemischt mit Schneeschauern",
      "night": "Gemischt mit Schneeschauern",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "33": {
      "day": "Bedeckt mit leichtem Regen",
      "night": "Bedeckt mit leichtem Regen",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "34": {
      "day": "Bedeckt mit leichtem Schneefall",
      "night": "Bedeckt mit leichtem Schneefall",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "35": {
      "day": "Bedeckt mit einer Mischung aus Schnee und Regen",
      "night": "Bedeckt mit einer Mischung aus Schnee und Regen",
      "iday": "Meist bewölkt mit leichtem Regen"
    },
    "01": {
      "day": "Klarer, wolkenloser Himmel",
      "night": "Klarer, wolkenloser Himmel",
      "iday": "Klarer, wolkenloser Himmel"
    },
    "02": {
      "day": "Klar, wenige Cirrus",
      "night": "Klar, wenige Cirrus",
      "iday": "Klar und wenige Wolken"
    },
    "03": {
      "day": "Klar mit Zirrus",
      "night": "Klar mit Zirrus",
      "iday": "Teilweise bewölkt"
    },
    "04": {
      "day": "Klar mit wenigen tiefen Wolken",
      "night": "Klar mit wenigen tiefen Wolken",
      "iday": "Bedeckt"
    },
    "05": {
      "day": "Klar mit wenigen tiefen Wolken und wenigen Zirruswolken",
      "night": "Klar mit wenigen tiefen Wolken und wenigen Zirruswolken",
      "iday": "Nebel"
    },
    "06": {
      "day": "Klar mit wenigen tiefen Wolken und Zirruswolken",
      "night": "Klar mit wenigen tiefen Wolken und Zirruswolken",
      "iday": "Bedeckt mit Regen"
    },
    "07": {
      "day": "Teilweise bewölkt",
      "night": "Teilweise bewölkt",
      "iday": "Gemischt mit Schauern"
    },
    "08": {
      "day": "Teilweise bewölkt und wenige Zirruswolken",
      "night": "Teilweise bewölkt und wenige Zirruswolken",
      "iday": "Schauer, Gewitter wahrscheinlich"
    },
    "09": {
      "day": "Teilweise bewölkt und Cirrus",
      "night": "Teilweise bewölkt und Cirrus",
      "iday": "Bedeckt mit Schnee"
    }
  },
  "eu": {
    "10": {
      "day": "Baliteke trumoi-hodei batzuekin nahastuta",
      "night": "Baliteke trumoi-hodei batzuekin nahastuta",
      "iday": "Elur zaparradekin nahastuta"
    },
    "11": {
      "day": "Zirro gutxirekin nahastuta, baliteke trumoi-hodei batzuk",
      "night": "Zirro gutxirekin nahastuta, baliteke trumoi-hodei batzuk",
      "iday": "Gehienbat hodeitsu elurra eta euria nahastuta"
    },
    "12": {
      "day": "Zirroekin nahastuta, baliteke trumoi-hodei batzuekin",
      "night": "Zirroekin nahastuta, baliteke trumoi-hodei batzuekin",
      "iday": "Lainotua euri arinarekin"
    },
    "13": {
      "day": "Argi baina lainotsu",
      "night": "Argi baina lainotsu",
      "iday": "Hodeitsu elur arinarekin"
    },
    "14": {
      "day": "Garbi baina lainotsu zirro gutxirekin",
      "night": "Garbi baina lainotsu zirro gutxirekin",
      "iday": "Gehienbat hodeitsu euriarekin"
    },
    "15": {
      "day": "Garbi baina lainotsu zirroekin",
      "night": "Garbi baina lainotsu zirroekin",
      "iday": "Gehienbat hodeitsu elurrarekin"
    },
    "16": {
      "day": "Lainoa/estratu baxuko hodeiak",
      "night": "Lainoa/estratu baxuko hodeiak",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "17": {
      "day": "Lainoa/estratu baxuko hodeiak zirro gutxirekin",
      "night": "Lainoa/estratu baxuko hodeiak zirro gutxirekin",
      "iday": "Gehienbat hodeitsu elur txikiarekin"
    },
    "18": {
      "day": "Lainoa/estratu baxuko hodeiak zirroekin",
      "night": "Lainoa/estratu baxuko hodeiak zirroekin",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "19": {
      "day": "Gehienbat hodeitsu",
      "night": "Gehienbat hodeitsu",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "20": {
      "day": "Gehienbat hodeitsu eta zirro gutxi",
      "night": "Gehienbat hodeitsu eta zirro gutxi",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "21": {
      "day": "Gehienbat hodeiak eta zirroak",
      "night": "Gehienbat hodeiak eta zirroak",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "22": {
      "day": "Lainotua",
      "night": "Lainotua",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "23": {
      "day": "Lainotua euriarekin",
      "night": "Lainotua euriarekin",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "24": {
      "day": "Lainotua elurrarekin",
      "night": "Lainotua elurrarekin",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "25": {
      "day": "Hodeitsu euritearekin",
      "night": "Hodeitsu euritearekin",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "26": {
      "day": "Hodeitsu elurte handiarekin",
      "night": "Hodeitsu elurte handiarekin",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "27": {
      "day": "Euria, trumoi-ekaitzak baliteke",
      "night": "Euria, trumoi-ekaitzak baliteke",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "28": {
      "day": "Euri arina, baliteke trumoi-ekaitzak",
      "night": "Euri arina, baliteke trumoi-ekaitzak",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "29": {
      "day": "Ekaitza elur gogorrekin",
      "night": "Ekaitza elur gogorrekin",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "30": {
      "day": "Euri zaparrada, trumoi-ekaitzak baliteke",
      "night": "Euri zaparrada, trumoi-ekaitzak baliteke",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "31": {
      "day": "Dutxarekin nahastuta",
      "night": "Dutxarekin nahastuta",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "32": {
      "day": "Elur zaparradekin nahastuta",
      "night": "Elur zaparradekin nahastuta",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "33": {
      "day": "Lainotua euri arinarekin",
      "night": "Lainotua euri arinarekin",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "34": {
      "day": "Hodeitsu elur arinarekin",
      "night": "Hodeitsu elur arinarekin",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "35": {
      "day": "Lainotua, elurra eta euria nahastuta",
      "night": "Lainotua, elurra eta euria nahastuta",
      "iday": "Gehienbat hodeitsuarekin euri txikiarekin"
    },
    "01": {
      "day": "Zeru garbia, hodeirik gabea",
      "night": "Zeru garbia, hodeirik gabea",
      "iday": "Zeru garbia, hodeirik gabea"
    },
    "02": {
      "day": "Garbi, zirro gutxi",
      "night": "Garbi, zirro gutxi",
      "iday": "Garbi eta hodei gutxi"
    },
    "03": {
      "day": "Zirroekin garbi",
      "night": "Zirroekin garbi",
      "iday": "Ostarteak"
    },
    "04": {
      "day": "Hodei gutxirekin",
      "night": "Hodei gutxirekin",
      "iday": "Lainotua"
    },
    "05": {
      "day": "Hodei gutxirekin eta zirro gutxirekin",
      "night": "Hodei gutxirekin eta zirro gutxirekin",
      "iday": "Lainoa"
    },
    "06": {
      "day": "Hodei gutxirekin eta zirroekin",
      "night": "Hodei gutxirekin eta zirroekin",
      "iday": "Lainotua euriarekin"
    },
    "07": {
      "day": "Ostarteak",
      "night": "Ostarteak",
      "iday": "Dutxarekin nahastuta"
    },
    "08": {
      "day": "Ostarteak eta zirro gutxi",
      "night": "Ostarteak eta zirro gutxi",
      "iday": "Zauriak, baliteke trumoi-ekaitzak"
    },
    "09": {
      "day": "Ostarteak eta zirroak",
      "night": "Ostarteak eta zirroak",
      "iday": "Lainotua elurrarekin"
    }
  },
  "ja": {
    "10": {
      "day": "雷雲が混じる可能性あり",
      "night": "雷雲が混じる可能性あり",
      "iday": "にわか雪混じり"
    },
    "11": {
      "day": "巻雲がほとんどなく、雷雨雲が発生する可能性があります",
      "night": "巻雲がほとんどなく、雷雨雲が発生する可能性があります",
      "iday": "曇り空で雪と雨が混じる"
    },
    "12": {
      "day": "巻雲が混じり、雷雲が発生する可能性があります",
      "night": "巻雲が混じり、雷雲が発生する可能性があります",
      "iday": "曇りで小雨あり"
    },
    "13": {
      "day": "クリアだけど霞んでいる",
      "night": "クリアだけど霞んでいる",
      "iday": "曇りで小雪あり"
    },
    "14": {
      "day": "晴れているが、巻雲がほとんどなく霞んでいる",
      "night": "晴れているが、巻雲がほとんどなく霞んでいる",
      "iday": "曇り時々雨"
    },
    "15": {
      "day": "晴れているが巻雲で霞んでいる",
      "night": "晴れているが巻雲で霞んでいる",
      "iday": "おおむね曇りで雪あり"
    },
    "16": {
      "day": "霧・低層雲",
      "night": "霧・低層雲",
      "iday": "曇り時々小雨"
    },
    "17": {
      "day": "霧/巻雲が少ない低層雲",
      "night": "霧/巻雲が少ない低層雲",
      "iday": "曇りがちで小雪あり"
    },
    "18": {
      "day": "巻雲を伴う霧/低層雲",
      "night": "巻雲を伴う霧/低層雲",
      "iday": "曇り時々小雨"
    },
    "19": {
      "day": "おおむね曇り",
      "night": "おおむね曇り",
      "iday": "曇り時々小雨"
    },
    "20": {
      "day": "ほぼ曇り、巻雲は少ない",
      "night": "ほぼ曇り、巻雲は少ない",
      "iday": "曇り時々小雨"
    },
    "21": {
      "day": "おおむね曇り、巻雲あり",
      "night": "おおむね曇り、巻雲あり",
      "iday": "曇り時々小雨"
    },
    "22": {
      "day": "曇り",
      "night": "曇り",
      "iday": "曇り時々小雨"
    },
    "23": {
      "day": "曇りで雨",
      "night": "曇りで雨",
      "iday": "曇り時々小雨"
    },
    "24": {
      "day": "雪で曇り",
      "night": "雪で曇り",
      "iday": "曇り時々小雨"
    },
    "25": {
      "day": "曇りで大雨",
      "night": "曇りで大雨",
      "iday": "曇り時々小雨"
    },
    "26": {
      "day": "曇りで大雪",
      "night": "曇りで大雪",
      "iday": "曇り時々小雨"
    },
    "27": {
      "day": "雨、雷雨の可能性があります",
      "night": "雨、雷雨の可能性があります",
      "iday": "曇り時々小雨"
    },
    "28": {
      "day": "小雨、雷雨の可能性があります",
      "night": "小雨、雷雨の可能性があります",
      "iday": "曇り時々小雨"
    },
    "29": {
      "day": "大雪を伴う嵐",
      "night": "大雪を伴う嵐",
      "iday": "曇り時々小雨"
    },
    "30": {
      "day": "大雨、雷雨の可能性があります",
      "night": "大雨、雷雨の可能性があります",
      "iday": "曇り時々小雨"
    },
    "31": {
      "day": "シャワーと混合",
      "night": "シャワーと混合",
      "iday": "曇り時々小雨"
    },
    "32": {
      "day": "にわか雪混じり",
      "night": "にわか雪混じり",
      "iday": "曇り時々小雨"
    },
    "33": {
      "day": "曇りで小雨あり",
      "night": "曇りで小雨あり",
      "iday": "曇り時々小雨"
    },
    "34": {
      "day": "曇りで小雪あり",
      "night": "曇りで小雪あり",
      "iday": "曇り時々小雨"
    },
    "35": {
      "day": "雪と雨が混じった曇り空",
      "night": "雪と雨が混じった曇り空",
      "iday": "曇り時々小雨"
    },
    "01": {
      "day": "雲ひとつない晴れた空",
      "night": "雲ひとつない晴れた空",
      "iday": "雲ひとつない晴れた空"
    },
    "02": {
      "day": "晴天、巻雲は少ない",
      "night": "晴天、巻雲は少ない",
      "iday": "快晴で雲も少ない"
    },
    "03": {
      "day": "巻雲ありで晴れ",
      "night": "巻雲ありで晴れ",
      "iday": "所により曇り"
    },
    "04": {
      "day": "低い雲はほとんどなく快晴",
      "night": "低い雲はほとんどなく快晴",
      "iday": "曇り"
    },
    "05": {
      "day": "晴れ、低い雲も巻雲もほとんどない",
      "night": "晴れ、低い雲も巻雲もほとんどない",
      "iday": "霧"
    },
    "06": {
      "day": "晴れ、低い雲と巻雲はほとんどない",
      "night": "晴れ、低い雲と巻雲はほとんどない",
      "iday": "曇りで雨"
    },
    "07": {
      "day": "所により曇り",
      "night": "所により曇り",
      "iday": "シャワーと混合"
    },
    "08": {
      "day": "曇り、巻雲は少ない",
      "night": "曇り、巻雲は少ない",
      "iday": "にわか雨、雷雨の可能性があります"
    },
    "09": {
      "day": "所により曇り、巻雲あり",
      "night": "所により曇り、巻雲あり",
      "iday": "雪で曇り"
    }
  },
  "no": {
    "10": {
      "day": "Blandet med noen tordenskyer mulig",
      "night": "Blandet med noen tordenskyer mulig",
      "iday": "Blandet med snøbyger"
    },
    "11": {
      "day": "Blandet med lite cirrus med noen tordenskyer mulig",
      "night": "Blandet med lite cirrus med noen tordenskyer mulig",
      "iday": "For det meste skyet med en blanding av snø og regn"
    },
    "12": {
      "day": "Blandet med cirrus med noen tordenskyer mulig",
      "night": "Blandet med cirrus med noen tordenskyer mulig",
      "iday": "Overskyet med lett regn"
    },
    "13": {
      "day": "Klart men disig",
      "night": "Klart men disig",
      "iday": "Overskyet med lett snø"
    },
    "14": {
      "day": "Klart men disig med lite cirrus",
      "night": "Klart men disig med lite cirrus",
      "iday": "For det meste overskyet med regn"
    },
    "15": {
      "day": "Klart men disig med cirrus",
      "night": "Klart men disig med cirrus",
      "iday": "For det meste overskyet med snø"
    },
    "16": {
      "day": "Tåke/lave stratusskyer",
      "night": "Tåke/lave stratusskyer",
      "iday": "For det meste skyet med lett regn"
    },
    "17": {
      "day": "Tåke/lave stratusskyer med lite cirrus",
      "night": "Tåke/lave stratusskyer med lite cirrus",
      "iday": "For det meste skyet med lett snø"
    },
    "18": {
      "day": "Tåke/lave stratusskyer med cirrus",
      "night": "Tåke/lave stratusskyer med cirrus",
      "iday": "For det meste skyet med lett regn"
    },
    "19": {
      "day": "For det meste overskyet",
      "night": "For det meste overskyet",
      "iday": "For det meste skyet med lett regn"
    },
    "20": {
      "day": "For det meste skyet og lite cirrus",
      "night": "For det meste skyet og lite cirrus",
      "iday": "For det meste skyet med lett regn"
    },
    "21": {
      "day": "For det meste skyet og cirrus",
      "night": "For det meste skyet og cirrus",
      "iday": "For det meste skyet med lett regn"
    },
    "22": {
      "day": "Overskyet",
      "night": "Overskyet",
      "iday": "For det meste skyet med lett regn"
    },
    "23": {
      "day": "Overskyet med regn",
      "night": "Overskyet med regn",
      "iday": "For det meste skyet med lett regn"
    },
    "24": {
      "day": "Overskyet med snø",
      "night": "Overskyet med snø",
      "iday": "For det meste skyet med lett regn"
    },
    "25": {
      "day": "Overskyet med kraftig regn",
      "night": "Overskyet med kraftig regn",
      "iday": "For det meste skyet med lett regn"
    },
    "26": {
      "day": "Overskyet med mye snø",
      "night": "Overskyet med mye snø",
      "iday": "For det meste skyet med lett regn"
    },
    "27": {
      "day": "Regn, tordenvær sannsynlig",
      "night": "Regn, tordenvær sannsynlig",
      "iday": "For det meste skyet med lett regn"
    },
    "28": {
      "day": "Lett regn, sannsynlig tordenvær",
      "night": "Lett regn, sannsynlig tordenvær",
      "iday": "For det meste skyet med lett regn"
    },
    "29": {
      "day": "Storm med mye snø",
      "night": "Storm med mye snø",
      "iday": "For det meste skyet med lett regn"
    },
    "30": {
      "day": "Kraftig regn, sannsynlig tordenvær",
      "night": "Kraftig regn, sannsynlig tordenvær",
      "iday": "For det meste skyet med lett regn"
    },
    "31": {
      "day": "Blandet med dusjer",
      "night": "Blandet med dusjer",
      "iday": "For det meste skyet med lett regn"
    },
    "32": {
      "day": "Blandet med snøbyger",
      "night": "Blandet med snøbyger",
      "iday": "For det meste skyet med lett regn"
    },
    "33": {
      "day": "Overskyet med lett regn",
      "night": "Overskyet med lett regn",
      "iday": "For det meste skyet med lett regn"
    },
    "34": {
      "day": "Overskyet med lett snø",
      "night": "Overskyet med lett snø",
      "iday": "For det meste skyet med lett regn"
    },
    "35": {
      "day": "Overskyet med blanding av snø og regn",
      "night": "Overskyet med blanding av snø og regn",
      "iday": "For det meste skyet med lett regn"
    },
    "01": {
      "day": "Klar, skyfri himmel",
      "night": "Klar, skyfri himmel",
      "iday": "Klar, skyfri himmel"
    },
    "02": {
      "day": "Klart, lite cirrus",
      "night": "Klart, lite cirrus",
      "iday": "Klart og lite skyer"
    },
    "03": {
      "day": "Tydelig med cirrus",
      "night": "Tydelig med cirrus",
      "iday": "Delvis skyet"
    },
    "04": {
      "day": "Klart med få lave skyer",
      "night": "Klart med få lave skyer",
      "iday": "Overskyet"
    },
    "05": {
      "day": "Klart med få lave skyer og lite cirrus",
      "night": "Klart med få lave skyer og lite cirrus",
      "iday": "Tåke"
    },
    "06": {
      "day": "Klart med få lave skyer og cirrus",
      "night": "Klart med få lave skyer og cirrus",
      "iday": "Overskyet med regn"
    },
    "07": {
      "day": "Delvis skyet",
      "night": "Delvis skyet",
      "iday": "Blandet med dusjer"
    },
    "08": {
      "day": "Delvis skyet og lite cirrus",
      "night": "Delvis skyet og lite cirrus",
      "iday": "Byger, tordenvær sannsynlig"
    },
    "09": {
      "day": "Delvis skyet og cirrus",
      "night": "Delvis skyet og cirrus",
      "iday": "Overskyet med snø"
    }
  },
  "pl": {
    "10": {
      "day": "Możliwe przemieszanie się z chmurami burzowymi",
      "night": "Możliwe przemieszanie się z chmurami burzowymi",
      "iday": "Zmieszane z przelotnymi opadami śniegu"
    },
    "11": {
      "day": "Możliwe pomieszanie z kilkoma cirrusami i możliwymi chmurami burzowymi",
      "night": "Możliwe pomieszanie z kilkoma cirrusami i możliwymi chmurami burzowymi",
      "iday": "Pochmurno przeważnie z domieszką śniegu i deszczu"
    },
    "12": {
      "day": "Możliwe pomieszanie z cirrusami i możliwymi chmurami burzowymi",
      "night": "Możliwe pomieszanie z cirrusami i możliwymi chmurami burzowymi",
      "iday": "Pochmurno ze słabymi opadami deszczu"
    },
    "13": {
      "day": "Jasne, ale mgliste",
      "night": "Jasne, ale mgliste",
      "iday": "Pochmurno ze słabymi opadami śniegu"
    },
    "14": {
      "day": "Jasne, ale zamglone z kilkoma cirrusami",
      "night": "Jasne, ale zamglone z kilkoma cirrusami",
      "iday": "Przeważnie pochmurno z opadami deszczu"
    },
    "15": {
      "day": "Jasne, ale zamglone z cirrusami",
      "night": "Jasne, ale zamglone z cirrusami",
      "iday": "Przeważnie pochmurno ze śniegiem"
    },
    "16": {
      "day": "Mgła/niskie chmury stratusowe",
      "night": "Mgła/niskie chmury stratusowe",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "17": {
      "day": "Chmury mgłowe/niskie stratus z kilkoma cirrusami",
      "night": "Chmury mgłowe/niskie stratus z kilkoma cirrusami",
      "iday": "Przeważnie pochmurno ze słabymi opadami śniegu"
    },
    "18": {
      "day": "Chmury mgłowe/niskie stratus z cirrusami",
      "night": "Chmury mgłowe/niskie stratus z cirrusami",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "19": {
      "day": "Przeważnie pochmurno",
      "night": "Przeważnie pochmurno",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "20": {
      "day": "Przeważnie pochmurno i niewiele cirrusów",
      "night": "Przeważnie pochmurno i niewiele cirrusów",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "21": {
      "day": "Przeważnie pochmurno i cirrus",
      "night": "Przeważnie pochmurno i cirrus",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "22": {
      "day": "Pochmurny",
      "night": "Pochmurny",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "23": {
      "day": "Pochmurno z opadami deszczu",
      "night": "Pochmurno z opadami deszczu",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "24": {
      "day": "Pochmurno ze śniegiem",
      "night": "Pochmurno ze śniegiem",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "25": {
      "day": "Pochmurno z intensywnymi opadami deszczu",
      "night": "Pochmurno z intensywnymi opadami deszczu",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "26": {
      "day": "Pochmurno z dużymi opadami śniegu",
      "night": "Pochmurno z dużymi opadami śniegu",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "27": {
      "day": "Możliwe opady deszczu, burze",
      "night": "Możliwe opady deszczu, burze",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "28": {
      "day": "Słaby deszcz, możliwe burze",
      "night": "Słaby deszcz, możliwe burze",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "29": {
      "day": "Burza z obfitymi opadami śniegu",
      "night": "Burza z obfitymi opadami śniegu",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "30": {
      "day": "Silne opady deszczu, możliwe burze",
      "night": "Silne opady deszczu, możliwe burze",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "31": {
      "day": "Mieszane z prysznicami",
      "night": "Mieszane z prysznicami",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "32": {
      "day": "Zmieszane z przelotnymi opadami śniegu",
      "night": "Zmieszane z przelotnymi opadami śniegu",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "33": {
      "day": "Pochmurno ze słabymi opadami deszczu",
      "night": "Pochmurno ze słabymi opadami deszczu",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "34": {
      "day": "Pochmurno ze słabymi opadami śniegu",
      "night": "Pochmurno ze słabymi opadami śniegu",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "35": {
      "day": "Pochmurno z mieszaniną śniegu i deszczu",
      "night": "Pochmurno z mieszaniną śniegu i deszczu",
      "iday": "Przeważnie pochmurno ze słabymi opadami deszczu"
    },
    "01": {
      "day": "Czyste, bezchmurne niebo",
      "night": "Czyste, bezchmurne niebo",
      "iday": "Czyste, bezchmurne niebo"
    },
    "02": {
      "day": "Przejrzyste, kilka cirrusów",
      "night": "Przejrzyste, kilka cirrusów",
      "iday": "Bezchmurnie i mało chmur"
    },
    "03": {
      "day": "Przejrzysty z cytrusami",
      "night": "Przejrzysty z cytrusami",
      "iday": "Częściowe zachmurzenie"
    },
    "04": {
      "day": "Bezchmurnie z kilkoma niskimi chmurami",
      "night": "Bezchmurnie z kilkoma niskimi chmurami",
      "iday": "Pochmurny"
    },
    "05": {
      "day": "Bezchmurnie z nielicznymi niskimi chmurami i kilkoma cirrusami",
      "night": "Bezchmurnie z nielicznymi niskimi chmurami i kilkoma cirrusami",
      "iday": "Mgła"
    },
    "06": {
      "day": "Bezchmurnie z nielicznymi niskimi chmurami i cirrusami",
      "night": "Bezchmurnie z nielicznymi niskimi chmurami i cirrusami",
      "iday": "Pochmurno z opadami deszczu"
    },
    "07": {
      "day": "Częściowe zachmurzenie",
      "night": "Częściowe zachmurzenie",
      "iday": "Mieszane z prysznicami"
    },
    "08": {
      "day": "Częściowe zachmurzenie i kilka cirrusów",
      "night": "Częściowe zachmurzenie i kilka cirrusów",
      "iday": "Możliwe opady deszczu, burze"
    },
    "09": {
      "day": "Częściowe zachmurzenie i cirrus",
      "night": "Częściowe zachmurzenie i cirrus",
      "iday": "Pochmurno ze śniegiem"
    }
  },
  "pt": {
    "10": {
      "day": "Misturado com algumas nuvens de trovoada possíveis",
      "night": "Misturado com algumas nuvens de trovoada possíveis",
      "iday": "Misturado com pancadas de neve"
    },
    "11": {
      "day": "Misturado com poucos cirros com algumas nuvens de trovoada possíveis",
      "night": "Misturado com poucos cirros com algumas nuvens de trovoada possíveis",
      "iday": "Muito nublado com uma mistura de neve e chuva"
    },
    "12": {
      "day": "Misturado com cirros com algumas nuvens de trovoada possíveis",
      "night": "Misturado com cirros com algumas nuvens de trovoada possíveis",
      "iday": "Nublado com chuva fraca"
    },
    "13": {
      "day": "Claro, mas nebuloso",
      "night": "Claro, mas nebuloso",
      "iday": "Nublado com neve fraca"
    },
    "14": {
      "day": "Claro, mas nebuloso com poucos cirros",
      "night": "Claro, mas nebuloso com poucos cirros",
      "iday": "Parcialmente nublado com chuva"
    },
    "15": {
      "day": "Claro, mas nebuloso com cirros",
      "night": "Claro, mas nebuloso com cirros",
      "iday": "Maioritariamente nublado com neve"
    },
    "16": {
      "day": "Nevoeiro/nuvens stratus baixas",
      "night": "Nevoeiro/nuvens stratus baixas",
      "iday": "Muito nublado com chuva fraca"
    },
    "17": {
      "day": "Nevoeiro/nuvens stratus baixas com poucos cirros",
      "night": "Nevoeiro/nuvens stratus baixas com poucos cirros",
      "iday": "Parcialmente nublado com neve fraca"
    },
    "18": {
      "day": "Nevoeiro/nuvens stratus baixas com cirros",
      "night": "Nevoeiro/nuvens stratus baixas com cirros",
      "iday": "Muito nublado com chuva fraca"
    },
    "19": {
      "day": "Maioritariamente nublado",
      "night": "Maioritariamente nublado",
      "iday": "Muito nublado com chuva fraca"
    },
    "20": {
      "day": "Muito nublado e com poucos cirros",
      "night": "Muito nublado e com poucos cirros",
      "iday": "Muito nublado com chuva fraca"
    },
    "21": {
      "day": "Principalmente nublado e cirros",
      "night": "Principalmente nublado e cirros",
      "iday": "Muito nublado com chuva fraca"
    },
    "22": {
      "day": "Nublado",
      "night": "Nublado",
      "iday": "Muito nublado com chuva fraca"
    },
    "23": {
      "day": "Nublado com chuva",
      "night": "Nublado com chuva",
      "iday": "Muito nublado com chuva fraca"
    },
    "24": {
      "day": "Nublado com neve",
      "night": "Nublado com neve",
      "iday": "Muito nublado com chuva fraca"
    },
    "25": {
      "day": "Nublado com chuva forte",
      "night": "Nublado com chuva forte",
      "iday": "Muito nublado com chuva fraca"
    },
    "26": {
      "day": "Nublado com muita neve",
      "night": "Nublado com muita neve",
      "iday": "Muito nublado com chuva fraca"
    },
    "27": {
      "day": "Chuva, trovoadas prováveis",
      "night": "Chuva, trovoadas prováveis",
      "iday": "Muito nublado com chuva fraca"
    },
    "28": {
      "day": "Chuva fraca, possibilidade de trovoadas",
      "night": "Chuva fraca, possibilidade de trovoadas",
      "iday": "Muito nublado com chuva fraca"
    },
    "29": {
      "day": "Tempestade com neve pesada",
      "night": "Tempestade com neve pesada",
      "iday": "Muito nublado com chuva fraca"
    },
    "30": {
      "day": "Chuva forte, possibilidade de trovoadas",
      "night": "Chuva forte, possibilidade de trovoadas",
      "iday": "Muito nublado com chuva fraca"
    },
    "31": {
      "day": "Misturado com chuveiros",
      "night": "Misturado com chuveiros",
      "iday": "Muito nublado com chuva fraca"
    },
    "32": {
      "day": "Misturado com pancadas de neve",
      "night": "Misturado com pancadas de neve",
      "iday": "Muito nublado com chuva fraca"
    },
    "33": {
      "day": "Nublado com chuva fraca",
      "night": "Nublado com chuva fraca",
      "iday": "Muito nublado com chuva fraca"
    },
    "34": {
      "day": "Nublado com neve fraca",
      "night": "Nublado com neve fraca",
      "iday": "Muito nublado com chuva fraca"
    },
    "35": {
      "day": "Nublado com mistura de neve e chuva",
      "night": "Nublado com mistura de neve e chuva",
      "iday": "Muito nublado com chuva fraca"
    },
    "01": {
      "day": "Céu claro e sem nuvens",
      "night": "Céu claro e sem nuvens",
      "iday": "Céu claro e sem nuvens"
    },
    "02": {
      "day": "Claro, poucos cirros",
      "night": "Claro, poucos cirros",
      "iday": "Claro e com poucas nuvens"
    },
    "03": {
      "day": "Claro com cirros",
      "night": "Claro com cirros",
      "iday": "Parcialmente nublado"
    },
    "04": {
      "day": "Claro com poucas nuvens baixas",
      "night": "Claro com poucas nuvens baixas",
      "iday": "Nublado"
    },
    "05": {
      "day": "Claro com poucas nuvens baixas e poucos cirros",
      "night": "Claro com poucas nuvens baixas e poucos cirros",
      "iday": "Névoa"
    },
    "06": {
      "day": "Claro com poucas nuvens baixas e cirros",
      "night": "Claro com poucas nuvens baixas e cirros",
      "iday": "Nublado com chuva"
    },
    "07": {
      "day": "Parcialmente nublado",
      "night": "Parcialmente nublado",
      "iday": "Misturado com chuveiros"
    },
    "08": {
      "day": "Parcialmente nublado e com poucos cirros",
      "night": "Parcialmente nublado e com poucos cirros",
      "iday": "Possíveis pancadas de chuva e trovoadas"
    },
    "09": {
      "day": "Parcialmente nublado e com cirros",
      "night": "Parcialmente nublado e com cirros",
      "iday": "Nublado com neve"
    }
  },
  "ru": {
    "10": {
      "day": "Возможна смешанная с грозовыми облаками.",
      "night": "Возможна смешанная с грозовыми облаками.",
      "iday": "Со снегопадами"
    },
    "11": {
      "day": "С небольшим количеством перистых облаков, возможны грозовые облака",
      "night": "С небольшим количеством перистых облаков, возможны грозовые облака",
      "iday": "Преимущественно облачно, временами снег и дождь"
    },
    "12": {
      "day": "Смешанный с перистыми облаками, возможны грозовые облака.",
      "night": "Смешанный с перистыми облаками, возможны грозовые облака.",
      "iday": "Пасмурно, небольшой дождь"
    },
    "13": {
      "day": "Ясно, но туманно",
      "night": "Ясно, но туманно",
      "iday": "Пасмурно, небольшой снег"
    },
    "14": {
      "day": "Ясно, но туманно, с небольшим количеством перистых облаков.",
      "night": "Ясно, но туманно, с небольшим количеством перистых облаков.",
      "iday": "Преимущественно облачно, дождь"
    },
    "15": {
      "day": "Ясно, но туманно с перистыми облаками",
      "night": "Ясно, но туманно с перистыми облаками",
      "iday": "Преимущественно облачно, снег"
    },
    "16": {
      "day": "Туман/низкие слоистые облака",
      "night": "Туман/низкие слоистые облака",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "17": {
      "day": "Туман/низкие слоистые облака с небольшим количеством перистых облаков",
      "night": "Туман/низкие слоистые облака с небольшим количеством перистых облаков",
      "iday": "Преимущественно облачно, небольшой снег"
    },
    "18": {
      "day": "Туман/низкие слоистые облака с перистыми облаками",
      "night": "Туман/низкие слоистые облака с перистыми облаками",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "19": {
      "day": "Преимущественно облачно",
      "night": "Преимущественно облачно",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "20": {
      "day": "Преимущественно облачно, небольшие облака",
      "night": "Преимущественно облачно, небольшие облака",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "21": {
      "day": "Преимущественно облачно и облачно",
      "night": "Преимущественно облачно и облачно",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "22": {
      "day": "Пасмурно",
      "night": "Пасмурно",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "23": {
      "day": "Пасмурно, дождь",
      "night": "Пасмурно, дождь",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "24": {
      "day": "Пасмурно, снег",
      "night": "Пасмурно, снег",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "25": {
      "day": "Пасмурно, сильный дождь",
      "night": "Пасмурно, сильный дождь",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "26": {
      "day": "Пасмурно, сильный снегопад",
      "night": "Пасмурно, сильный снегопад",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "27": {
      "day": "Возможен дождь, гроза",
      "night": "Возможен дождь, гроза",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "28": {
      "day": "Небольшой дождь, возможны грозы",
      "night": "Небольшой дождь, возможны грозы",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "29": {
      "day": "Шторм с сильным снегопадом",
      "night": "Шторм с сильным снегопадом",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "30": {
      "day": "Сильный дождь, возможны грозы",
      "night": "Сильный дождь, возможны грозы",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "31": {
      "day": "Смешанный с душем",
      "night": "Смешанный с душем",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "32": {
      "day": "Со снегопадами",
      "night": "Со снегопадами",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "33": {
      "day": "Пасмурно, небольшой дождь",
      "night": "Пасмурно, небольшой дождь",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "34": {
      "day": "Пасмурно, небольшой снег",
      "night": "Пасмурно, небольшой снег",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "35": {
      "day": "Пасмурно, временами снег и дождь",
      "night": "Пасмурно, временами снег и дождь",
      "iday": "Преимущественно облачно, небольшой дождь"
    },
    "01": {
      "day": "Ясное, безоблачное небо",
      "night": "Ясное, безоблачное небо",
      "iday": "Ясное, безоблачное небо"
    },
    "02": {
      "day": "Ясно, мало перистых облаков",
      "night": "Ясно, мало перистых облаков",
      "iday": "Ясно, мало облаков"
    },
    "03": {
      "day": "Ясно с перистыми частицами",
      "night": "Ясно с перистыми частицами",
      "iday": "Переменная облачность"
    },
    "04": {
      "day": "Ясно, небольшая низкая облачность",
      "night": "Ясно, небольшая низкая облачность",
      "iday": "Пасмурно"
    },
    "05": {
      "day": "Ясно, небольшие низкие облака и перистые облака.",
      "night": "Ясно, небольшие низкие облака и перистые облака.",
      "iday": "Туман"
    },
    "06": {
      "day": "Ясно, небольшие низкие облака и перистые облака.",
      "night": "Ясно, небольшие низкие облака и перистые облака.",
      "iday": "Пасмурно, дождь"
    },
    "07": {
      "day": "Переменная облачность",
      "night": "Переменная облачность",
      "iday": "Смешанный с душем"
    },
    "08": {
      "day": "Небольшая облачность, небольшие облака",
      "night": "Небольшая облачность, небольшие облака",
      "iday": "Возможны дожди, грозы"
    },
    "09": {
      "day": "Небольшая облачность и облака",
      "night": "Небольшая облачность и облака",
      "iday": "Пасмурно, снег"
    }
  },
  "zh": {
    "10": {
      "day": "可能混有一些雷暴云",
      "night": "可能混有一些雷暴云",
      "iday": "夹杂阵雪"
    },
    "11": {
      "day": "可能混有少量卷云和一些雷暴云",
      "night": "可能混有少量卷云和一些雷暴云",
      "iday": "大部分多云，夹雪雨"
    },
    "12": {
      "day": "可能与卷云和一些雷暴云混合",
      "night": "可能与卷云和一些雷暴云混合",
      "iday": "阴有小雨"
    },
    "13": {
      "day": "清澈却又朦胧",
      "night": "清澈却又朦胧",
      "iday": "阴有小雪"
    },
    "14": {
      "day": "清澈但朦胧，有少量卷云",
      "night": "清澈但朦胧，有少量卷云",
      "iday": "大致多云，有雨"
    },
    "15": {
      "day": "清澈但有卷云朦胧",
      "night": "清澈但有卷云朦胧",
      "iday": "大部分多云，有雪"
    },
    "16": {
      "day": "雾/低层云",
      "night": "雾/低层云",
      "iday": "大致多云，有小雨"
    },
    "17": {
      "day": "雾/低层云，有少量卷云",
      "night": "雾/低层云，有少量卷云",
      "iday": "大部分多云，有小雪"
    },
    "18": {
      "day": "雾/低层云与卷云",
      "night": "雾/低层云与卷云",
      "iday": "大致多云，有小雨"
    },
    "19": {
      "day": "大部分多云",
      "night": "大部分多云",
      "iday": "大致多云，有小雨"
    },
    "20": {
      "day": "大部分多云，少量卷云",
      "night": "大部分多云，少量卷云",
      "iday": "大致多云，有小雨"
    },
    "21": {
      "day": "大部分多云且有卷云",
      "night": "大部分多云且有卷云",
      "iday": "大致多云，有小雨"
    },
    "22": {
      "day": "灰蒙蒙",
      "night": "灰蒙蒙",
      "iday": "大致多云，有小雨"
    },
    "23": {
      "day": "阴有雨",
      "night": "阴有雨",
      "iday": "大致多云，有小雨"
    },
    "24": {
      "day": "阴有雪",
      "night": "阴有雪",
      "iday": "大致多云，有小雨"
    },
    "25": {
      "day": "阴有大雨",
      "night": "阴有大雨",
      "iday": "大致多云，有小雨"
    },
    "26": {
      "day": "阴有大雪",
      "night": "阴有大雪",
      "iday": "大致多云，有小雨"
    },
    "27": {
      "day": "可能有雨、雷阵雨",
      "night": "可能有雨、雷阵雨",
      "iday": "大致多云，有小雨"
    },
    "28": {
      "day": "可能有小雨、雷阵雨",
      "night": "可能有小雨、雷阵雨",
      "iday": "大致多云，有小雨"
    },
    "29": {
      "day": "暴风雨和大雪",
      "night": "暴风雨和大雪",
      "iday": "大致多云，有小雨"
    },
    "30": {
      "day": "可能有大雨、雷阵雨",
      "night": "可能有大雨、雷阵雨",
      "iday": "大致多云，有小雨"
    },
    "31": {
      "day": "与阵雨混合",
      "night": "与阵雨混合",
      "iday": "大致多云，有小雨"
    },
    "32": {
      "day": "夹杂阵雪",
      "night": "夹杂阵雪",
      "iday": "大致多云，有小雨"
    },
    "33": {
      "day": "阴有小雨",
      "night": "阴有小雨",
      "iday": "大致多云，有小雨"
    },
    "34": {
      "day": "阴有小雪",
      "night": "阴有小雪",
      "iday": "大致多云，有小雨"
    },
    "35": {
      "day": "阴有雨夹雪",
      "night": "阴有雨夹雪",
      "iday": "大致多云，有小雨"
    },
    "01": {
      "day": "晴朗无云的天空",
      "night": "晴朗无云的天空",
      "iday": "晴朗无云的天空"
    },
    "02": {
      "day": "晴朗，少量卷云",
      "night": "晴朗，少量卷云",
      "iday": "晴朗且少云"
    },
    "03": {
      "day": "清晰有卷云",
      "night": "清晰有卷云",
      "iday": "多云"
    },
    "04": {
      "day": "晴朗，有少量低云",
      "night": "晴朗，有少量低云",
      "iday": "灰蒙蒙"
    },
    "05": {
      "day": "晴朗，有少量低云和少量卷云",
      "night": "晴朗，有少量低云和少量卷云",
      "iday": "多雾路段"
    },
    "06": {
      "day": "晴朗，有少量低云和卷云",
      "night": "晴朗，有少量低云和卷云",
      "iday": "阴有雨"
    },
    "07": {
      "day": "多云",
      "night": "多云",
      "iday": "与阵雨混合"
    },
    "08": {
      "day": "部分多云，少量卷云",
      "night": "部分多云，少量卷云",
      "iday": "可能有阵雨、雷暴"
    },
    "09": {
      "day": "部分多云，有卷云",
      "night": "部分多云，有卷云",
      "iday": "阴有雪"
    }
  }
};

export function getWeatherIcon(
  code: string,
  language: SupportedLanguage = DEFAULT_LANGUAGE,
  isDaily: boolean = false,
  isDay?: boolean
): WeatherIconInfo {
  if (!WEATHER_ICONS[code]) {
    return {
      icon: "/icons/weather/01_day.svg",
      description: "Unknown weather",
    };
  }

  const normalizedLanguage = getIntlLocale(language);
  const safeLanguage = isAppLanguage(normalizedLanguage)
    ? normalizedLanguage
    : DEFAULT_LANGUAGE;

  const iconInfo = WEATHER_ICONS[code];
  const descriptions = WEATHER_DESCRIPTIONS[safeLanguage]?.[code];

  const iconType: "day" | "night" | "iday" = isDaily
    ? iconInfo.iday
      ? "iday"
      : "day"
    : isDay === true
      ? "day"
      : "night";

  const iconPath = "/icons/weather/" + iconInfo[iconType];
  const description = descriptions?.[iconType] || "Unknown weather";

  return {
    icon: iconPath,
    description,
  };
}

export function getAvailableWeatherCodes(): string[] {
  return Object.keys(WEATHER_ICONS);
}

export function getSupportedLanguages(): SupportedLanguage[] {
  return Object.keys(WEATHER_DESCRIPTIONS) as SupportedLanguage[];
}

export function isValidWeatherCode(code: string): boolean {
  return code in WEATHER_ICONS;
}

export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return isAppLanguage(language);
}
