import { useEffect, useMemo, useState } from "react";
import type { Baby } from "./api";

export type CarePreferences = {
  jaundice: boolean;
  cordCare: boolean;
  temperatureShortcut: boolean;
  bathTouch: boolean;
  diaperDetails: boolean;
};

export type CarePreferenceKey = keyof CarePreferences;

export const CARE_PREFERENCE_ITEMS: Array<{
  key: CarePreferenceKey;
  title: string;
  description: string;
}> = [
  {
    key: "jaundice",
    title: "黄疸记录",
    description: "新生儿早期观察用，关闭后隐藏黄疸入口和日报项。",
  },
  {
    key: "cordCare",
    title: "脐部护理",
    description: "脐带脱落稳定后可关闭，历史护理记录仍保留。",
  },
  {
    key: "temperatureShortcut",
    title: "体温快捷入口",
    description: "关闭后首页不显示体温快捷卡，添加记录页仍可记录体温。",
  },
  {
    key: "bathTouch",
    title: "洗澡/抚触",
    description: "按需记录洗澡或抚触护理，不需要时可隐藏入口。",
  },
  {
    key: "diaperDetails",
    title: "大便详细观察",
    description: "关闭后只记录基础大小便，不再要求颜色、性状和量。",
  },
];

function getBabyAgeDays(birthDate?: string): number {
  if (!birthDate) return 0;
  const [year, month, day] = birthDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return 0;
  const birthDay = Date.UTC(year, month - 1, day);
  const today = new Date();
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((currentDay - birthDay) / 86_400_000));
}

export function getDefaultCarePreferences(birthDate?: string): CarePreferences {
  const isNewborn = getBabyAgeDays(birthDate) <= 30;
  return {
    jaundice: isNewborn,
    cordCare: isNewborn,
    temperatureShortcut: isNewborn,
    bathTouch: isNewborn,
    diaperDetails: isNewborn,
  };
}

function getStorageKey(babyId?: number | null): string {
  return babyId ? `baby_care_preferences_${babyId}` : "baby_care_preferences_default";
}

export function loadCarePreferences(baby?: Baby | null): CarePreferences {
  const defaults = getDefaultCarePreferences(baby?.birth_date);
  if (typeof window === "undefined") return defaults;

  const raw = window.localStorage.getItem(getStorageKey(baby?.id));
  if (!raw) return defaults;

  try {
    return { ...defaults, ...(JSON.parse(raw) as Partial<CarePreferences>) };
  } catch {
    return defaults;
  }
}

export function saveCarePreferences(baby: Baby | null | undefined, preferences: CarePreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(baby?.id), JSON.stringify(preferences));
}

export function isRecordTypeVisible(
  type: string,
  preferences: CarePreferences,
  surface: "quick" | "add" | "daily" = "quick",
): boolean {
  if (type === "jaundice") return preferences.jaundice;
  if (type === "cord_care") return preferences.cordCare;
  if (type === "bath_touch") return preferences.bathTouch;
  if (type === "temperature") return surface === "quick" ? preferences.temperatureShortcut : true;
  return true;
}

export function useCarePreferences(baby?: Baby | null) {
  const [preferences, setPreferences] = useState<CarePreferences>(() => loadCarePreferences(baby));

  useEffect(() => {
    setPreferences(loadCarePreferences(baby));
  }, [baby?.birth_date, baby?.id]);

  const actions = useMemo(() => ({
    setPreference(key: CarePreferenceKey, value: boolean) {
      setPreferences((current) => {
        const next = { ...current, [key]: value };
        saveCarePreferences(baby, next);
        return next;
      });
    },
    reset() {
      const next = getDefaultCarePreferences(baby?.birth_date);
      saveCarePreferences(baby, next);
      setPreferences(next);
    },
  }), [baby]);

  return { preferences, ...actions };
}
