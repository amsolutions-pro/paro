"use client";

import { useEffect } from "react";

export function GeoCheckinClient({ isAuthed }: { isAuthed: boolean }) {
  useEffect(() => {
    if (!isAuthed) return;
    if (sessionStorage.getItem("paro-checkin")) return;
    fetch("/api/user/checkin", { method: "POST" })
      .then(() => sessionStorage.setItem("paro-checkin", "1"))
      .catch(() => {});
  }, [isAuthed]);
  return null;
}
