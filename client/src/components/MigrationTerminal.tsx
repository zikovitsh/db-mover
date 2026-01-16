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
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MigrationTerminalProps {
  logs: string[];
  progress: number;
  status: "pending" | "running" | "completed" | "failed";
  stats?: {
    collections: number;
    documents: number;
  };
}

export function MigrationTerminal({
  logs,
  progress,
  status,
  stats,
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
      className="w-full max-w-5xl mx-auto rounded-[3rem] glass-card shadow-3xl overflow-hidden border-white/10"
    >
      <CardHeader className="border-b border-white/5 bg-white/[0.01] p-10 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
              <Terminal className="h-7 w-7 text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <CardTitle className="text-2xl font-black tracking-tighter text-white">
                Deployment <span className="text-white/40">Console</span>
              </CardTitle>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black">
                    Live Channel
                  </span>
                </div>
                <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
                  Instance: ALPHA-01
                </span>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "capitalize px-8 py-3 rounded-2xl border transition-all duration-700 font-black tracking-widest text-xs shadow-2xl",
              status === "running" &&
                "bg-indigo-600 text-white border-indigo-400 glow-primary",
              status === "completed" &&
                "bg-emerald-600 text-white border-emerald-400",
              status === "failed" && "bg-rose-600 text-white border-rose-400",
              status === "pending" && "bg-white/5 text-white/40 border-white/10"
            )}
          >
            {status === "running" && (
              <Loader2 className="mr-3 h-4 w-4 animate-spin" />
            )}
            {status === "completed" && (
              <CheckCircle2 className="mr-3 h-4 w-4" />
            )}
            {status === "failed" && <XCircle className="mr-3 h-4 w-4" />}
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-12 space-y-10">
          <div className="space-y-6">
            <div className="flex justify-between items-end px-2">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20">
                  Relocation Velocity
                </span>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-6xl font-black tracking-tighter text-white">
                    {Math.round(progress)}
                  </h4>
                  <span className="text-2xl font-bold text-white/30">%</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2">
                  <Activity
                    className={cn(
                      "h-4 w-4",
                      status === "running"
                        ? "text-indigo-400 animate-pulse"
                        : "text-white/10"
                    )}
                  />
                  <span className="text-[11px] text-white/60 font-black uppercase tracking-widest">
                    {status === "running" ? "Synchronizing" : "Standby"}
                  </span>
                </div>
                {status === "running" && (
                  <span className="text-[10px] font-mono text-indigo-400/60 font-medium">
                    MTU: 1500 BYTES
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-4 w-full bg-white/[0.03] rounded-2xl overflow-hidden border border-white/5 p-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-400 rounded-xl relative shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:50px_50px] animate-[slide_2s_linear_infinite]" />
              </motion.div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-8">
              <StatCard
                icon={<Layers className="h-6 w-6" />}
                label="Structural Units"
                value={stats.collections}
                color="indigo"
              />
              <StatCard
                icon={<Database className="h-6 w-6" />}
                label="Data Entries"
                value={stats.documents.toLocaleString()}
                color="blue"
              />
            </div>
          )}
        </div>

        <div className="mx-12 mb-12 overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/60 backdrop-blur-3xl shadow-2xl relative">
          <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-white/[0.02] relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex gap-2 mr-4">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/30 border border-rose-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/30 border border-amber-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
              </div>
              <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">
                System Log <span className="text-white/10 mx-2">//</span>{" "}
                SECURE_STREAM
              </span>
            </div>
            <Zap className="h-4 w-4 text-white/10" />
          </div>
          <div
            ref={scrollRef}
            className="h-[320px] overflow-y-auto p-8 font-mono text-sm md:text-base space-y-4 scrollbar-thin scrollbar-thumb-white/5 relative z-10"
          >
            {logs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-white/10 gap-4">
                <Activity className="h-10 w-10 animate-pulse" />
                <span className="text-xs uppercase tracking-[0.4em] font-black">
                  Awaiting Stream Data...
                </span>
              </div>
            )}
            {logs.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-6 items-start font-medium"
              >
                <span className="text-[10px] text-white/20 shrink-0 select-none mt-1.5 font-bold tracking-tighter">
                  {new Date().toLocaleTimeString("en-GB", { hour12: false })}
                </span>
                <span
                  className={cn(
                    "leading-relaxed tracking-tight text-sm",
                    log.includes("Error") || log.includes("Failed")
                      ? "text-rose-400"
                      : log.includes("Success") || log.includes("Completed")
                      ? "text-emerald-400"
                      : "text-white/70"
                  )}
                >
                  <span className="text-indigo-500/40 mr-4 font-black">›</span>
                  {log}
                </span>
              </motion.div>
            ))}
          </div>
          <div className="px-8 py-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500/40" />
              <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">
                End-to-End Tunneling Encrypted
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/30 font-black tracking-widest">
              0 ERRORS <span className="text-white/10 px-2">|</span> 100%
              INTEGRITY
            </div>
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
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center gap-10 group hover:bg-white/[0.04] transition-all duration-500">
      <div
        className={cn(
          "p-5 rounded-2xl border transition-all duration-500 group-hover:scale-110",
          color === "indigo"
            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
        )}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-white/30 uppercase tracking-[0.3em] font-black">
          {label}
        </span>
        <span className="text-4xl font-black tracking-tighter text-white">
          {value}
        </span>
      </div>
    </div>
  );
}
