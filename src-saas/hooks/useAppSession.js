import { useContext } from "react";
import AppSessionContext from "../context/AppSessionContext";

export const useAppSession = () => {
  const context = useContext(AppSessionContext);

  if (!context) {
    throw new Error("useAppSession must be used inside AppSessionProvider");
  }

  return context;
};

