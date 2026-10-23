import { useEffect, useState } from "react";
import { Button, Chip, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { applicationApi } from "../api";
import { uuid } from "../applications/model";
import { preparationApi } from "./api";

type Counts = { tasks: number; lines: number; participations: number };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export function PreparationCard({ businessIds }: { businessIds: string[] }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setUnavailable(false); setCounts(null);
    (async () => {
      try {
        const participationIds = new Set<string>();
        for (const businessId of businessIds) {
          const result = await applicationApi.list(businessId);
          if (!Array.isArray(result)) throw new Error("Invalid application list.");
          for (const item of result) if (object(item) && item.businessId === businessId && uuid(item.participationId)) participationIds.add(item.participationId);
        }
        const documents = await Promise.all([...participationIds].map((id) => preparationApi.get(id)));
        let tasks = 0, lines = 0;
        for (const document of documents) {
          if (!object(document) || !Array.isArray(document.tasks) || !object(document.budget) || !Array.isArray(document.budget.lines)) throw new Error("Invalid preparation response.");
          tasks += document.tasks.length; lines += document.budget.lines.length;
        }
        if (active) setCounts({ tasks, lines, participations: participationIds.size });
      } catch { if (active) setUnavailable(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [businessIds.join(":")]);
  return <>
    <Chip label="Available" size="small" sx={{ mb: 2 }} />
    {loading ? <Typography role="status" sx={{ mb: 2 }}>Loading saved preparation counts…</Typography> : unavailable ?
      <Typography role="status" sx={{ mb: 2 }}>Preparation counts are temporarily unavailable.</Typography> :
      <Typography sx={{ mb: 2 }}>{counts!.tasks} tasks · {counts!.lines} budget lines across {counts!.participations} participations.</Typography>}
    <Button component={RouterLink} to="/business/preparation" variant="outlined" size="small" sx={{ mt: "auto" }}>Open preparation</Button>
  </>;
}
