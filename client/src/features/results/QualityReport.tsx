// src/features/results/QualityReport.tsx
interface QualityReportProps {
  content: string;
}

export default function QualityReport({ content }: QualityReportProps) {
  const lines = content.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="border-4 border-black p-6 bg-white">
      <ul className="list-disc list-inside space-y-2 font-mono text-sm">
        {lines.map((line, idx) => (
          <li key={idx} className="text-black">{line}</li>
        ))}
      </ul>
    </div>
  );
}
