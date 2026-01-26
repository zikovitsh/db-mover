import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Github,
  Download,
  ArrowLeftRight,
  CheckCircle2,
  Terminal,
} from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

const fadinUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
};

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center text-center">
        {/* Subtle background highlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <motion.div
            custom={0}
            variants={fadinUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm"
          >
            <Github className="h-3.5 w-3.5 text-white/60" />
            <span className="text-sm font-medium text-white/80">
              100% Open Source
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadinUp}
            initial="hidden"
            animate="visible"
            className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]"
          >
            Database migration <br />
            <span className="text-white/40">without the stress.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadinUp}
            initial="hidden"
            animate="visible"
            className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed"
          >
            A visual tool to copy, move, and download your data. Forget complex
            CLI commands and connection strings, just point, click, and move.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadinUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button
              size="lg"
              onClick={onStart}
              className="h-12 px-8 text-base rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            >
              Start Moving Data
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 rounded-full border-white/10 hover:bg-white/5 text-white/80 hover:text-white transition-all backdrop-blur-sm bg-transparent"
              onClick={() =>
                window.open("https://github.com/JC-Coder/db-mover", "_blank")
              }
            >
              <Github className="mr-2 h-4 w-4" />
              View Code
            </Button>
          </motion.div>
        </div>

        {/* Mock Interface Preview */}
        <motion.div
          custom={4}
          variants={fadinUp}
          initial="hidden"
          animate="visible"
          className="mt-20 relative w-full max-w-3xl mx-auto"
        >
          <div className="relative rounded-xl bg-[#0A0A0B] border border-white/10 shadow-2xl overflow-hidden">
            {/* Mock Window Header */}
            <div className="h-10 border-b border-white/5 bg-white/[0.02] flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
              </div>
            </div>

            {/* Mock Content */}
            <div className="p-8 space-y-6 text-left relative overflow-hidden">
              <div className="absolute top-4 right-4 opacity-[0.05] pointer-events-none">
                <img
                  src="/logo.svg"
                  alt="Logo Watermark"
                  className="w-32 h-32"
                />
              </div>
              {/* Progress Bar */}
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[92%] rounded-full" />
              </div>

              {/* Mock Logs */}
              <div className="space-y-2 font-mono text-xs text-white/50 bg-black/40 p-4 rounded-lg border border-white/5 relative z-10">
                <div className="flex gap-2">
                  <span className="text-indigo-400">➜</span>
                  <span>Connecting to source...</span>
                  <span className="text-emerald-500 ml-auto">Done</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400">➜</span>
                  <span>Verifying schema...</span>
                  <span className="text-emerald-500 ml-auto">OK</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400">➜</span>
                  <span className="text-white">Copying data...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative glow behind the mock */}
          <div className="absolute -inset-1 bg-indigo-500/20 blur-xl -z-10 rounded-[2rem]" />
        </motion.div>
      </section>

      {/* Value Props */}
      <section className="px-6 py-24 border-t border-white/[0.03]">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Terminal className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                No CLI Required
              </h3>
              <p className="text-white/50 leading-relaxed">
                Stop wrestling with `mongodump` and `psql` flags. Connect your
                databases via a clean UI and let us handle the commands.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <ArrowLeftRight className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Direct Transfer
              </h3>
              <p className="text-white/50 leading-relaxed">
                Stream data directly from source to destination. No need to
                download massive dump files to your local machine first.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Download className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Easy Backups</h3>
              <p className="text-white/50 leading-relaxed">
                Need a local copy? One click downloads your entire database
                structure and data as a compressed archive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Steps */}
      <section className="px-6 py-24 bg-white/[0.01]">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-16">How it works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line for desktop */}
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="relative flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[#0A0A0B] border border-white/10 flex items-center justify-center z-10">
                <span className="text-lg font-bold text-white">1</span>
              </div>
              <h4 className="text-lg font-medium text-white">Connect</h4>
              <p className="text-sm text-white/40">
                Enter your source and destination connection strings.
              </p>
            </div>

            <div className="relative flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[#0A0A0B] border border-white/10 flex items-center justify-center z-10">
                <span className="text-lg font-bold text-white">2</span>
              </div>
              <h4 className="text-lg font-medium text-white">Select</h4>
              <p className="text-sm text-white/40">
                Choose specific collections or move the entire database.
              </p>
            </div>

            <div className="relative flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[#0A0A0B] border border-white/10 flex items-center justify-center z-10">
                <span className="text-lg font-bold text-white">3</span>
              </div>
              <h4 className="text-lg font-medium text-white">Move</h4>
              <p className="text-sm text-white/40">
                Watch the progress bar as your data flies to its new home.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack / Open Source */}
      <section className="px-6 py-24 border-t border-white/[0.03]">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-6 max-w-lg">
            <h2 className="text-3xl font-bold text-white">
              Powered by the Community
            </h2>
            <p className="text-white/50 leading-relaxed">
              db mover is fully open source. We believe developer tools should
              be transparent, free, and hackable. Check out the code, contribute
              a PR, or fork it for your own needs.
            </p>
            <div className="flex flex-wrap gap-3">
              <TechBadge name="TypeScript" />
              <TechBadge name="React" />
              <TechBadge name="Node.js" />
              <TechBadge name="MongoDB" />
              <TechBadge name="Postgres" />
              <TechBadge name="MySQL" />
              <TechBadge name="Redis" />
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 max-w-md w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                <Github className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-white">JC-Coder / db-mover</div>
                <div className="text-sm text-white/40">MIT License</div>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-white/60 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white/40" />
                <span>Transparent Logic</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white/40" />
                <span>No Tracking</span>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full bg-white text-black hover:bg-white/90"
              onClick={() =>
                window.open("https://github.com/JC-Coder/db-mover", "_blank")
              }
            >
              Star on GitHub
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function TechBadge({ name }: { name: string }) {
  return (
    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60">
      {name}
    </div>
  );
}
