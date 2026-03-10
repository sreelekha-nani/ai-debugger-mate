import { Terminal, Play, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConsoleOutputProps {
  output: string;
  isRunning: boolean;
  onRun: () => void;
  onClear: () => void;
}

const ConsoleOutput = ({ output, isRunning, onRun, onClear }: ConsoleOutputProps) => {
  return (
    <div className="flex flex-col h-full border-t border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-card border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-mono font-medium">Console Output</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear} disabled={isRunning}>
            <Trash2 className="w-3 h-3 mr-1" /> Clear
          </Button>
          <Button size="sm" className="h-6 px-3 text-xs font-bold" onClick={onRun} disabled={isRunning}>
            {isRunning ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running...</>
            ) : (
              <><Play className="w-3 h-3 mr-1" /> Run Code</>
            )}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <pre className="p-3 font-mono text-xs leading-relaxed text-terminal-foreground bg-terminal whitespace-pre-wrap break-words min-h-[80px]">
          {output || <span className="text-terminal-muted italic">Click "Run Code" to see output...</span>}
        </pre>
      </ScrollArea>
    </div>
  );
};

export default ConsoleOutput;
