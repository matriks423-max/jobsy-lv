import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";

export function useToast() {
  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      if (type === "success") {
        sonnerToast.success(message);
      } else if (type === "error") {
        sonnerToast.error(message);
      } else {
        sonnerToast(message);
      }
    },
    []
  );

  return { toast };
}
