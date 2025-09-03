import { useEffect, useState } from "react";
import { versionsStore } from "./VersionsStore";

export const useSharedVersions = (record) => {
  const [state, setState] = useState(versionsStore.getState());

  useEffect(() => {
    // Subscribe to store updates
    const unsubscribe = versionsStore.subscribe(setState);

    // Fetch versions if not already loading/loaded for this record
    versionsStore.fetchVersions(record);

    return unsubscribe;
  }, [record]);

  return state;
};