import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { Baby } from "./api";
import { fetchBabies } from "./api";
import { useAuth } from "./AuthContext";

interface BabyContextType {
  baby: Baby | null;
  babies: Baby[];
  loading: boolean;
  hasBaby: boolean;
  refresh: () => Promise<void>;
  setBaby: (baby: Baby) => void;
}

const BabyContext = createContext<BabyContextType | null>(null);

export function BabyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [baby, setBaby] = useState<Baby | null>(null);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [loading, setLoading] = useState(true);
  const selectBaby = useCallback((nextBaby: Baby) => {
    setBaby(nextBaby);
    setBabies((current) => current.some((item) => item.id === nextBaby.id) ? current : [nextBaby, ...current]);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setBabies([]);
      setBaby(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await fetchBabies();
      setBabies(data);
      setBaby((current) => {
        if (current && data.some((item) => item.id === current.id)) return current;
        return data[0] || null;
      });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      setBabies([]);
      setBaby(null);
      void refresh();
    }
  }, [user?.id, authLoading, refresh]);

  const hasBaby = babies.length > 0;

  return (
    <BabyContext.Provider value={{ baby, babies, loading: loading || authLoading, hasBaby, refresh, setBaby: selectBaby }}>
      {children}
    </BabyContext.Provider>
  );
}

export function useBaby() {
  const context = useContext(BabyContext);
  if (!context) {
    throw new Error("useBaby must be used within BabyProvider");
  }
  return context;
}
