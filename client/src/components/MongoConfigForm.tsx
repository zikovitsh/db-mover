import { useState } from "react";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Download,
  Play,
  Eye,
  EyeOff,
  Loader2,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface MongoConfigFormProps {
  onStartCopy: (config: any) => void;
  onStartDownload: (config: any) => void;
}

export function MongoConfigForm({
  onStartCopy,
  onStartDownload,
}: MongoConfigFormProps) {
  const [mode, setMode] = useState<"copy" | "download">("copy");
  const [sourceUri, setSourceUri] = useState("");
  const [targetUri, setTargetUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showTarget, setShowTarget] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!sourceUri.startsWith("mongodb")) {
        toast.error("Connection Error", {
          description: "The source connection string is not recognized.",
        });
        setLoading(false);
        return;
      }

      if (mode === "copy") {
        if (!targetUri.startsWith("mongodb")) {
          toast.error("Connection Error", {
            description: "The destination connection string is not recognized.",
          });
          setLoading(false);
          return;
        }
        await onStartCopy({ sourceUri, targetUri });
      } else {
        await onStartDownload({ sourceUri });
      }
    } catch (err) {
      console.error(err);
      toast.error("Execution Error", {
        description: "Failed to initialize the data transport pipeline.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto rounded-[3rem] glass-card shadow-2xl overflow-hidden border-white/10"
    >
      <CardHeader className="space-y-4 p-12 pb-10 border-b border-white/5 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        <div className="flex items-center gap-3 mb-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-indigo-400">
            Pipeline Configuration
          </span>
        </div>
        <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tighter">
          Cloud <span className="text-white/60">Credentials</span>
        </CardTitle>
        <CardDescription className="text-lg text-muted-foreground font-light tracking-tight leading-relaxed">
          Securely map your infrastructure endpoints for seamless data flow.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-12 pt-10 space-y-12">
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 flex gap-5 text-indigo-200/60 text-sm backdrop-blur-sm">
          <AlertCircle className="h-6 w-6 shrink-0 text-indigo-400" />
          <p className="leading-relaxed font-light">
            All credentials are processed in-memory and never persisted. Ensure
            your firewall allows traffic from our migration nodes.
          </p>
        </div>

        <Tabs
          defaultValue="copy"
          onValueChange={(v) => setMode(v as any)}
          className="space-y-12"
        >
          <TabsList className="grid w-full grid-cols-2 p-1.5 bg-white/5 rounded-[1.5rem] h-16 border border-white/5">
            <TabsTrigger
              value="copy"
              className="rounded-2xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg h-full transition-all font-bold text-sm tracking-tight"
            >
              Migration Stream
            </TabsTrigger>
            <TabsTrigger
              value="download"
              className="rounded-2xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg h-full transition-all font-bold text-sm tracking-tight"
            >
              Archive Bundle
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-5">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Source Connection String
                </Label>
                <Link2 className="h-4 w-4 text-indigo-400/40" />
              </div>
              <div className="relative group">
                <Input
                  type={showSource ? "text" : "password"}
                  placeholder="mongodb+srv://user:pass@host/db"
                  value={sourceUri}
                  onChange={(e) => setSourceUri(e.target.value)}
                  autoComplete="one-time-code"
                  data-lpignore="true"
                  data-form-type="other"
                  name="source_uri"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-16 bg-white/[0.03] border-white/10 rounded-2xl px-8 pr-16 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-mono text-sm placeholder:text-white/10 shadow-inner"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 top-3 h-10 w-10 p-0 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                  onClick={() => setShowSource(!showSource)}
                >
                  {showSource ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <TabsContent
              value="copy"
              className="m-0 space-y-10 animate-in fade-in slide-in-from-top-4 duration-700"
            >
              <div className="space-y-5">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Destination Connection String
                  </Label>
                  <Link2 className="h-4 w-4 text-indigo-400/40" />
                </div>
                <div className="relative group">
                  <Input
                    type={showTarget ? "text" : "password"}
                    placeholder="mongodb+srv://user:pass@host/db"
                    value={targetUri}
                    onChange={(e) => setTargetUri(e.target.value)}
                    autoComplete="one-time-code"
                    data-lpignore="true"
                    data-form-type="other"
                    name="target_uri"
                    autoCorrect="off"
                    spellCheck={false}
                    className="h-16 bg-white/[0.03] border-white/10 rounded-2xl px-8 pr-16 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-mono text-sm placeholder:text-white/10 shadow-inner"
                    required={mode === "copy"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-3 h-10 w-10 p-0 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                    onClick={() => setShowTarget(!showTarget)}
                  >
                    {showTarget ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="download"
              className="m-0 animate-in fade-in slide-in-from-top-4 duration-700"
            >
              <div className="p-10 rounded-[2rem] bg-indigo-500/5 border border-dashed border-indigo-500/20 text-center space-y-4">
                <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Download className="h-8 w-8 text-indigo-400" />
                </div>
                <p className="text-lg font-bold tracking-tight text-white">
                  Compressed Data Archive
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed font-light max-w-sm mx-auto">
                  Generates a high-compression encrypted bundle of your entire
                  infrastructure for secure offline storage.
                </p>
              </div>
            </TabsContent>

            <Button
              type="submit"
              className="w-full h-16 rounded-2xl text-lg font-black bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(255,255,255,0.05)] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />{" "}
                  Initializing...
                </>
              ) : mode === "copy" ? (
                <>
                  Deploy Migration Stream
                  <Play className="ml-3 h-5 w-5 fill-current" />
                </>
              ) : (
                <>
                  Generate Archive <Download className="ml-3 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </motion.div>
  );
}
