import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MigrationTerminal } from "@/components/MigrationTerminal";
import api from "@/lib/api";
import { toast } from "sonner";

export function MigrationPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "pending" | "running" | "completed" | "failed"
  >("pending");
  const [stats, setStats] = useState({ collections: 0, documents: 0 });

  useEffect(() => {
    if (!jobId) return;

    const es = new EventSource(`/api/migrate/${jobId}/status`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.logs) setLogs(data.logs);
        if (data.progress !== undefined) setProgress(data.progress);
        if (data.status) setStatus(data.status);
        if (data.stats) setStats(data.stats);

        if (data.status === "completed" || data.status === "failed") {
          es.close();
        }
      } catch (e) {
        console.error("Error parsing SSE", e);
      }
    };

    es.onerror = (err) => {
      console.error("SSE Error", err);
      // Don't toast here as it might be a temporary disconnect
    };

    return () => {
      es.close();
    };
  }, [jobId]);

  return (
    <div className="container mx-auto px-6 max-w-7xl pt-12 pb-24">
      <MigrationTerminal
        logs={logs}
        progress={progress}
        status={status}
        stats={stats}
      />
    </div>
  );
}
