// src/features/results/RebuiltCode.tsx
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/themes/prism.css'; // optional, but we'll style manually
import { Copy, Download } from 'lucide-react';
import { useState } from 'react';

interface RebuiltCodeProps {
  code: string;
  language: string; // 'auto' or specific
}

const languageMap: Record<string, any> = {
  python: languages.python,
  javascript: languages.javascript,
  typescript: languages.typescript,
  java: languages.java,
  c: languages.c,
  cpp: languages.cpp,
  csharp: languages.csharp,
  go: languages.go,
  rust: languages.rust,
  ruby: languages.ruby,
  php: languages.php,
};

export default function RebuiltCode({ code, language }: RebuiltCodeProps) {
  const [copied, setCopied] = useState(false);
  const lang = language === 'auto' ? 'plaintext' : languageMap[language] ? language : 'plaintext';
  const highlightFn = (code: string) => {
    if (lang === 'plaintext' || !languageMap[lang]) return code;
    return highlight(code, languageMap[lang], lang);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rebuilt.${language === 'auto' ? 'txt' : language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-4 border-black bg-white">
      <div className="flex justify-end gap-2 p-2 border-b-4 border-black">
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          <Copy size={16} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={download}
          className="flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          <Download size={16} />
          Download
        </button>
      </div>
      <div className="p-4 font-mono text-sm overflow-auto max-h-96">
        <Editor
          value={code}
          onValueChange={() => {}}
          highlight={highlightFn}
          padding={10}
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 14,
            backgroundColor: 'white',
            color: 'black',
          }}
          disabled
        />
      </div>
    </div>
  );
}
