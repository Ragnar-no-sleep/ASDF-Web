'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import Ace Editor (client-side only)
const AceEditor = dynamic(
  async () => {
    const ace = await import('react-ace');
    // Import modes and themes
    await import('ace-builds/src-noconflict/mode-typescript');
    await import('ace-builds/src-noconflict/mode-javascript');
    await import('ace-builds/src-noconflict/mode-rust');
    await import('ace-builds/src-noconflict/mode-sh');
    await import('ace-builds/src-noconflict/mode-json');
    await import('ace-builds/src-noconflict/theme-one_dark');
    return ace;
  },
  { ssr: false }
);

interface CodeChallengeProps {
  description: string;
  language: string;
  solution: string;
  onComplete: () => void;
  initialCode?: string;
}

export function CodeChallenge({
  description,
  language,
  solution,
  onComplete,
  initialCode = '',
}: CodeChallengeProps) {
  const [code, setCode] = useState(initialCode || getStarterCode(language));
  const [showSolution, setShowSolution] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // Handle code change
  const handleEditorChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  // Simulate running code (in real app, would execute on Devnet)
  const handleRun = async () => {
    setIsRunning(true);
    setOutput(null);

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock output based on language
    const mockOutput = getMockOutput(language, code);
    setOutput(mockOutput);
    setIsRunning(false);
  };

  // Show solution
  const handleShowSolution = () => {
    setShowSolution(true);
    setCode(solution);
  };

  // Mark as complete
  const handleComplete = () => {
    setCompleted(true);
    onComplete();
  };

  return (
    <div>
      {/* Description */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Challenge</h3>
        <p className="text-[#ccc]">{description}</p>
      </div>

      {/* Editor Container */}
      <div className="border border-[#222] rounded-xl overflow-hidden">
        {/* Editor Header */}
        <div className="bg-[#111] px-4 py-3 border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
              <div className="w-3 h-3 rounded-full bg-[#4ade80]" />
            </div>
            <span className="text-xs text-[#666] ml-2">{language}</span>
          </div>
          <div className="flex items-center gap-2">
            {!showSolution && (
              <button
                onClick={handleShowSolution}
                className="px-3 py-1.5 text-xs text-[#666] hover:text-[#f59e0b] transition-colors"
              >
                Show Solution
              </button>
            )}
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              className="px-3 py-1.5 text-xs text-[#666] hover:text-white transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Ace Editor */}
        <div className="h-[300px] bg-[#0d0d0d]">
          <AceEditor
            mode={getAceMode(language)}
            theme="one_dark"
            value={code}
            onChange={handleEditorChange}
            name="code-challenge-editor"
            width="100%"
            height="100%"
            fontSize={14}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
            setOptions={{
              enableBasicAutocompletion: false,
              enableLiveAutocompletion: false,
              enableSnippets: false,
              showLineNumbers: true,
              tabSize: 2,
              useWorker: false,
            }}
            style={{
              fontFamily: 'JetBrains Mono, Consolas, monospace',
            }}
          />
        </div>

        {/* Action Bar */}
        <div className="bg-[#111] px-4 py-3 border-t border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-4 py-2 bg-[#4ade80] rounded-lg text-sm font-medium text-black hover:bg-[#22c55e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                <>Run Code</>
              )}
            </button>
            <button
              onClick={() => setCode(getStarterCode(language))}
              className="px-4 py-2 bg-[#222] rounded-lg text-sm text-[#888] hover:text-white transition-colors"
            >
              Reset
            </button>
          </div>

          {!completed && (
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-[#ea4e33] rounded-lg text-sm font-medium text-white hover:bg-[#d94429] transition-colors"
            >
              Mark Complete
            </button>
          )}

          {completed && (
            <span className="text-[#4ade80] text-sm font-medium flex items-center gap-1">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Output */}
      <AnimatePresence>
        {output && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 bg-[#0d0d0d] border border-[#222] rounded-xl overflow-hidden"
          >
            <div className="px-4 py-2 border-b border-[#222] flex items-center justify-between">
              <span className="text-xs text-[#666]">Output</span>
              <button
                onClick={() => setOutput(null)}
                className="text-xs text-[#666] hover:text-white"
              >
                Clear
              </button>
            </div>
            <pre className="p-4 text-sm text-[#4ade80] font-mono overflow-x-auto whitespace-pre-wrap">
              {output}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Solution Revealed */}
      {showSolution && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-4 bg-[#f59e0b]/5 border border-[#f59e0b]/30 rounded-xl"
        >
          <div className="flex items-start gap-2">
            <span>💡</span>
            <div>
              <p className="text-sm text-[#f59e0b] font-medium mb-1">Solution Revealed</p>
              <p className="text-xs text-[#888]">
                The solution has been loaded into the editor. Study it carefully and try to
                understand each line.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tips */}
      <div className="mt-4 p-4 bg-[#111] rounded-xl">
        <h4 className="text-sm font-medium text-white mb-2">Tips</h4>
        <ul className="text-xs text-[#888] space-y-1">
          <li>• Use the Run button to test your code</li>
          <li>• Check the output panel for results and errors</li>
          <li>• If stuck, use &quot;Show Solution&quot; to see the answer</li>
          <li>• Mark as complete when you understand the concept</li>
        </ul>
      </div>
    </div>
  );
}

// Helper: Get Ace Editor mode
function getAceMode(lang: string): string {
  const map: Record<string, string> = {
    typescript: 'typescript',
    javascript: 'javascript',
    rust: 'rust',
    bash: 'sh',
    shell: 'sh',
    json: 'json',
  };
  return map[lang.toLowerCase()] || 'javascript';
}

// Helper: Get starter code template
function getStarterCode(lang: string): string {
  const templates: Record<string, string> = {
    typescript: `// Your code here
import { Connection, PublicKey } from '@solana/web3.js';

async function main() {
  // Write your solution

}

main();`,
    bash: `# Your commands here

`,
    rust: `// Your Rust code here
fn main() {
    // Write your solution
}`,
  };
  return templates[lang.toLowerCase()] || '// Your code here\n';
}

// Helper: Mock output (would be real execution in production)
function getMockOutput(lang: string, code: string): string {
  // Simple mock - in production would actually execute
  if (code.includes('console.log')) {
    return '> Running code...\n> Execution successful!\n\nOutput:\nHello, Solana!';
  }
  if (code.includes('solana')) {
    return `> Connecting to Devnet...
> Connected to https://api.devnet.solana.com
>
> Execution completed successfully!
>
> Results:
> - Network: Devnet
> - Status: OK`;
  }
  return '> Code executed successfully!\n> No output generated.';
}

export default CodeChallenge;
