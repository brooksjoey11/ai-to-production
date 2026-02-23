// src/features/submission/CodeSubmission.tsx
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { trpc } from '../../lib/trpc';
import { detectLanguageFromFilename } from '../../lib/utils';
import LanguageSelector from './LanguageSelector';
import CommentsField from './CommentsField';
import RateLimitDisplay from '../../components/RateLimitDisplay';
import { useRateLimit } from '../../hooks/useRateLimit';

const MAX_SIZE = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE) || 1048576; // 1MB default

interface CodeSubmissionProps {
  onSuccess: (submissionId: string, results: { forensicDossier: string; rebuiltCode: string; qualityReport: string }) => void;
}

export default function CodeSubmission({ onSuccess }: CodeSubmissionProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [comments, setComments] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const { current, limit, resetTime } = useRateLimit();
  const submitMutation = trpc.code.submit.useMutation({
    onSuccess: (data) => {
      onSuccess(data.submissionId, {
        forensicDossier: data.forensicDossier,
        rebuiltCode: data.rebuiltCode,
        qualityReport: data.qualityReport,
      });
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_SIZE) {
        setFileError(`File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCode(content);
        const detected = detectLanguageFromFilename(file.name);
        setLanguage(detected);
        setFile(file);
        setFileError(null);
      };
      reader.readAsText(file);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'text/*': ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.cpp', '.c', '.cs', '.php'],
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (current >= limit) {
      alert('Rate limit exceeded. Please try again later.');
      return;
    }
    submitMutation.mutate({ code, language, comments });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <RateLimitDisplay current={current} limit={limit} resetTime={resetTime} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <label className="block font-sans text-xs font-bold uppercase tracking-widest mb-2">
            Paste Source Code
          </label>
          <div
            {...getRootProps()}
            className={`border-4 border-black p-4 bg-white cursor-pointer transition-colors ${
              isDragActive ? 'bg-gray-100' : ''
            }`}
          >
            <input {...getInputProps()} />
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your AI-generated code here, or drag & drop a file..."
              className="w-full h-96 font-mono text-sm bg-transparent border-none outline-none resize-none"
              disabled={submitMutation.isLoading}
            />
          </div>
          {file && <p className="mt-2 text-sm text-gray-600">File: {file.name}</p>}
          {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
        </div>

        <div className="space-y-6">
          <LanguageSelector value={language} onChange={setLanguage} />
          <CommentsField value={comments} onChange={setComments} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitMutation.isLoading || !code.trim() || current >= limit}
          className="px-12 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitMutation.isLoading ? 'Processing...' : 'Fix My Code'}
        </button>
      </div>
    </form>
  );
}
