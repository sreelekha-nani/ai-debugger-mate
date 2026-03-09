import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Brain, ChevronRight, RotateCcw, CheckCircle2, XCircle, Code2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface QuizQuestion {
  title: string;
  language: string;
  difficulty: string;
  type: string;
  problem_statement: string;
  code: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

const Quiz = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const generateQuestion = async () => {
    setLoading(true);
    setSelectedAnswer(null);
    setRevealed(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz-question");
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setQuestion(data as QuizQuestion);
    } catch (e: any) {
      toast({ title: "Failed to generate question", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option: string) => {
    if (revealed) return;
    setSelectedAnswer(option);
  };

  const revealAnswer = () => {
    if (!selectedAnswer || !question) return;
    setRevealed(true);
    const isCorrect = selectedAnswer.trim() === question.answer.trim();
    setStats((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Save to database
    if (user) {
      supabase.from("quiz_submissions").insert({
        user_id: user.id,
        language: question.language,
        question_type: question.type,
        difficulty: question.difficulty,
        is_correct: isCorrect,
      }).then(({ error }) => {
        if (error) console.error("Failed to save quiz result:", error);
      });
    }
  };

  const langColor = question?.language === "Python" ? "text-accent" : question?.language === "Java" ? "text-warning" : "text-primary";
  const typeLabel = question?.type === "output_prediction" ? "🔮 Output Prediction" : question?.type === "debugging" ? "🐛 Debugging" : "🧠 Logic";

  // Start screen
  if (!question) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <span className="font-bold text-lg">Quiz Mode</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-16 max-w-lg">
          <Card className="border-accent/20">
            <CardContent className="pt-8 pb-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-accent" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Interview Quiz</h1>
                <p className="text-muted-foreground">
                  AI-generated interview questions covering Python, Java & SQL. Test output prediction, debugging, and logic skills.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-sm text-muted-foreground space-y-1">
                <p>🐍 Python · ☕ Java · 🗃️ SQL</p>
                <p>🔮 Output prediction · 🐛 Debugging · 🧠 Logic</p>
                <p>📊 Track your accuracy as you go</p>
              </div>

              <Button onClick={generateQuestion} disabled={loading} className="w-full h-12 text-base font-bold">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Generating Question...
                  </>
                ) : (
                  <>Start Quiz <Sparkles className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-accent" />
            </div>
            <span className="font-bold text-lg">Quiz Mode</span>
            <Badge variant="outline" className="text-xs">
              {stats.correct}/{stats.total} correct
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-5">
        {/* Question info */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${langColor}`}>{question.language}</Badge>
          <Badge variant="outline" className="text-xs">{question.difficulty}</Badge>
          <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
        </div>

        <h1 className="text-2xl font-bold">{question.title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{question.problem_statement}</p>

        {/* Code block */}
        <Card className="border-primary/20 overflow-hidden">
          <CardHeader className="py-2 px-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/70" />
                <div className="w-3 h-3 rounded-full bg-warning/70" />
                <div className="w-3 h-3 rounded-full bg-success/70" />
              </div>
              <span className="text-sm font-mono text-muted-foreground">
                <Code2 className="w-3 h-3 inline mr-1" />
                {question.language.toLowerCase()}_quiz
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="p-4 bg-terminal text-terminal-foreground font-mono text-sm overflow-x-auto leading-relaxed">
              <code>{question.code}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Question */}
        <Card className="border-accent/20">
          <CardContent className="pt-5 pb-4">
            <p className="font-semibold text-base mb-4">{question.question}</p>

            <div className="space-y-2">
              {question.options.map((option, i) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = revealed && option.trim() === question.answer.trim();
                const isWrong = revealed && isSelected && !isCorrect;

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(option)}
                    disabled={revealed}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                      isCorrect
                        ? "border-success bg-success/10 text-success"
                        : isWrong
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground/40 hover:bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{option}</span>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto text-success" />}
                      {isWrong && <XCircle className="w-4 h-4 ml-auto text-destructive" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {!revealed ? (
          <Button
            onClick={revealAnswer}
            disabled={!selectedAnswer}
            className="w-full h-12 text-base font-bold"
          >
            Submit Answer <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Explanation */}
            <Card className={`border-2 ${selectedAnswer?.trim() === question.answer.trim() ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {selectedAnswer?.trim() === question.answer.trim() ? (
                    <><CheckCircle2 className="w-5 h-5 text-success" /><span className="font-bold text-success">Correct!</span></>
                  ) : (
                    <><XCircle className="w-5 h-5 text-destructive" /><span className="font-bold text-destructive">Incorrect</span></>
                  )}
                </div>
                <p className="text-sm font-medium mb-1">Answer: {question.answer}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{question.explanation}</p>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={generateQuestion} disabled={loading} className="flex-1 h-12">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <><RotateCcw className="w-4 h-4 mr-2" /> Next Question</>
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="h-12">
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
