import { useEffect, useRef } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Layers,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MigrationTerminalProps {
  logs: string[];
  progress: number;
  status: "pending" | "running" | "completed" | "failed";
  dbType?: string;
  stats?: {
    collections: number;
    documents: number;
    keys?: number;
    totalDocuments?: number;
  };
  onRetry?: () => void;
}

export function MigrationTerminal({
  logs,
  progress,
  status,
  dbType,
  stats,
  onRetry,
}: MigrationTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto rounded-3xl glass-card shadow-2xl overflow-hidden border-white/10"
    >
      <CardHeader className="border-b border-white/5 bg-white/[0.01] p-6 flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Terminal className="h-5 w-5 text-indigo-400" />
          </div>
          <CardTitle className="text-xl font-bold text-white">
            Migration Status
          </CardTitle>
        </div>
        <div className="flex items-center gap-3">
          {status === "failed" && onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          <Badge
            variant="outline"
            className={cn(
              "capitalize px-4 py-2 rounded-xl border font-medium text-xs",
              status === "running" &&
                "bg-indigo-600/10 text-indigo-400 border-indigo-500/20",
              status === "completed" &&
                "bg-emerald-600/10 text-emerald-400 border-emerald-500/20",
              status === "failed" &&
                "bg-rose-600/10 text-rose-400 border-rose-500/20",
              status === "pending" &&
                "bg-white/5 text-white/40 border-white/10",
            )}
          >
            {status === "running" && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            {status === "completed" && (
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
            )}
            {status === "failed" && <XCircle className="mr-2 h-3.5 w-3.5" />}
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-end px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                Progress
              </span>
              <span className="text-2xl font-bold text-white">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="relative h-2 w-full bg-white/[0.03] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="h-full bg-indigo-500 rounded-full"
              />
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<Layers className="h-5 w-5" />}
                label={dbType === "redis" ? "Keys processed" : "Collections"}
                value={
                  dbType === "redis"
                    ? stats.documents.toLocaleString()
                    : stats.collections
                }
              />
              <StatCard
                icon={<Database className="h-5 w-5" />}
                label={dbType === "redis" ? "Total keys" : "Documents"}
                value={
                  dbType === "redis" && stats.totalDocuments
                    ? stats.totalDocuments.toLocaleString()
                    : stats.documents.toLocaleString()
                }
              />
            </div>
          )}
        </div>

        <div className="mx-8 mb-8 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <div className="flex items-center px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <span className="text-xs font-medium text-muted-foreground">
              Log Output
            </span>
          </div>
          <div
            ref={scrollRef}
            className="h-[240px] overflow-y-auto p-4 font-mono text-sm space-y-2 scrollbar-thin scrollbar-thumb-white/10"
          >
            {logs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-white/20">
                <span className="text-xs">Waiting for logs...</span>
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 text-xs md:text-sm">
                <span className="text-white/30 shrink-0 select-none">
                  {new Date().toLocaleTimeString("en-GB", { hour12: false })}
                </span>
                <span
                  className={cn(
                    "break-all",
                    log.includes("Error") || log.includes("Failed")
                      ? "text-rose-400"
                      : log.includes("Success") || log.includes("Completed")
                        ? "text-emerald-400"
                        : "text-white/70",
                  )}
                >
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4">
      <div className="p-2.5 rounded-xl bg-white/5 text-white/70">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
