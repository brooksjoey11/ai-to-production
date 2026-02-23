// src/pages/Home.tsx
import { useState } from 'react';
import CodeSubmission from '../features/submission/CodeSubmission';
import CodeResults from '../features/results/CodeResults';
import { trpc } from '../lib/trpc';

export default function Home() {
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [results, setResults] = useState<{
    forensicDossier: string;
    rebuiltCode: string;
    qualityReport: string;
  } | null>(null);

  const handleSubmissionSuccess = (
    id: string,
    data: { forensicDossier: string; rebuiltCode: string; qualityReport: string }
  ) => {
    setSubmissionId(id);
    setResults(data);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b-4 border-black py-8">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="font-sans text-6xl md:text-7xl font-black uppercase tracking-tighter">
            AI TO PRODUCTION
          </h1>
          <p className="font-sans text-xl text-gray-600 mt-2">Forensic Code Analysis Platform</p>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-12">
        {!results ? (
          <CodeSubmission onSuccess={handleSubmissionSuccess} />
        ) : (
          <div>
            <CodeResults
              submissionId={submissionId!}
              forensicDossier={results.forensicDossier}
              rebuiltCode={results.rebuiltCode}
              qualityReport={results.qualityReport}
            />
            <button
              onClick={() => {
                setSubmissionId(null);
                setResults(null);
              }}
              className="mt-8 px-8 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors"
            >
              New Analysis
            </button>
          </div>
        )}
      </main>

      <footer className="border-t-4 border-black mt-20 py-8">
        <div className="container mx-auto px-4 md:px-8 text-sm text-gray-600">
          © 2026 AI to Production. Built for reliability.
        </div>
      </footer>
    </div>
  );
}
