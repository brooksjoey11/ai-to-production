// src/features/results/ExportAll.tsx
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';
import { useState } from 'react';

interface ExportAllProps {
  forensicDossier: string;
  rebuiltCode: string;
  qualityReport: string;
}

export default function ExportAll({ forensicDossier, rebuiltCode, qualityReport }: ExportAllProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const zip = new JSZip();
    zip.file('forensic_dossier.md', forensicDossier);
    zip.file('rebuilt_code.txt', rebuiltCode);
    zip.file('quality_report.txt', qualityReport);
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'ai-to-production-results.zip');
    setExporting(false);
  };

  return (
    <div className="flex justify-end">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-8 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
      >
        <Download size={20} />
        {exporting ? 'Exporting...' : 'Export All'}
      </button>
    </div>
  );
}
