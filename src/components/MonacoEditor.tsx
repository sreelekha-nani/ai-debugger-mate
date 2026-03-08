import Editor from "@monaco-editor/react";
import { toast } from "@/hooks/use-toast";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}

const MonacoEditor = ({ value, onChange, language = "python" }: MonacoEditorProps) => {
  const handleEditorMount = (editor: any) => {
    // Disable paste from external sources
    editor.onDidPaste(() => {
      // We can't fully prevent paste in Monaco, but we track it
    });

    // Add keyboard shortcut interception for paste
    editor.addCommand(
      // Monaco KeyMod.CtrlCmd | Monaco KeyCode.KeyV
      2048 | 52, // CtrlCmd + V
      () => {
        toast({
          title: "Paste Disabled",
          description: "External pasting is not allowed in the arena.",
          variant: "destructive",
        });
      }
    );
  };

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(val) => onChange(val || "")}
      onMount={handleEditorMount}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: "on",
        renderLineHighlight: "all",
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 4,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true },
      }}
    />
  );
};

export default MonacoEditor;
