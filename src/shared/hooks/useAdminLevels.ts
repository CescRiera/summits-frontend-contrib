import { useState, useEffect, useCallback } from "react";
import { getCountries, getAdminChildren } from "../../shared/api/endpoints/peakLists";
import type { AdminArea } from "../../shared/api/types/common";

export interface AdminLevel {
  options: AdminArea[];
  selectedId: number | null;
  selectedName: string | null;
  loading: boolean;
}

export const useAdminLevels = (
  onChange?: (data: { ids: number[]; names: string[] }) => void
) => {
  const [adminLevels, setAdminLevels] = useState<AdminLevel[]>([
    { options: [], selectedId: null, selectedName: null, loading: false },
  ]);

  // Load initial countries
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setAdminLevels([{ options: [], selectedId: null, selectedName: null, loading: true }]);
        const countries = await getCountries();
        
        setAdminLevels([
          { options: countries, selectedId: null, selectedName: null, loading: false }
        ]);
      } catch (error) {
        console.error("Failed to load countries:", error);
        setAdminLevels([{ options: [], selectedId: null, selectedName: null, loading: false }]);
      }
    };
    loadCountries();
  }, []);

  const handleAdminLevelChange = useCallback(async (index: number, id: number | null) => {
    // 1. Update the current levels and notify parent immediately
    let updatedLevels: AdminLevel[] = [];
    
    setAdminLevels(prev => {
      const newLevels = [...prev].slice(0, index + 1);
      const currentLevel = newLevels[index];
      
      if (currentLevel) {
        const selectedOption = id 
          ? currentLevel.options.find(o => o.osm_id === id)
          : null;
        newLevels[index] = { 
          ...currentLevel, 
          selectedId: id,
          selectedName: selectedOption ? selectedOption.name : null 
        };
      }
      
      updatedLevels = newLevels;
      return newLevels;
    });

    // Notify about changes (moved outside setAdminLevels to avoid side effects during render)
    if (onChange && updatedLevels.length > 0) {
      const ids = updatedLevels
        .map(level => level.selectedId)
        .filter((id): id is number => id !== null);
      const names = updatedLevels
        .map(level => level.selectedName)
        .filter((name): name is string => name !== null);
      onChange({ ids, names });
    }

    // 2. If an ID was selected, fetch children for the next level
    if (id !== null) {
      try {
        // Add a loading level
        setAdminLevels(prev => [...prev, { options: [], selectedId: null, selectedName: null, loading: true }]);
        
        const children = await getAdminChildren(id);
        
        setAdminLevels(prev => {
          const levels = [...prev];
          // Replace the loading level with results or remove if no children
          if (children.length > 0) {
            levels[levels.length - 1] = { options: children, selectedId: null, selectedName: null, loading: false };
            return levels;
          } else {
            return levels.slice(0, -1);
          }
        });
      } catch (error) {
        console.error("Failed to load admin children:", error);
        setAdminLevels(prev => prev.slice(0, -1));
      }
    }
  }, [onChange]);

  const resetAdminLevels = useCallback(async () => {
    try {
      setAdminLevels([{ options: [], selectedId: null, selectedName: null, loading: true }]);
      const countries = await getCountries();
      setAdminLevels([{ options: countries, selectedId: null, selectedName: null, loading: false }]);
    } catch (error) {
      console.error("Failed to reset countries:", error);
      setAdminLevels([{ options: [], selectedId: null, selectedName: null, loading: false }]);
    }
  }, []);

  return {
    adminLevels,
    handleAdminLevelChange,
    resetAdminLevels,
    setAdminLevels
  };
};
