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

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchBabies();
      setBabies(data);
      if (data.length > 0 && !baby) {
        setBaby(data[0]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user, baby]);

  useEffect(() => {
    if (!authLoading) {
      refresh();
    }
  }, [user, authLoading]);

  const hasBaby = babies.length > 0;

  return (
    <BabyContext.Provider value={{ baby, babies, loading: loading || authLoading, hasBaby, refresh, setBaby }}>
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
