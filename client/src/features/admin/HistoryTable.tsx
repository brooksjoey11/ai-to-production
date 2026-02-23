// src/features/admin/HistoryTable.tsx
import { trpc } from '../../lib/trpc';
import { format } from 'date-fns';

export default function HistoryTable() {
  // In a real implementation, you'd have a query for admin.getSubmissions
  // For now, use mock data per spec
  const mockData = [
    {
      id: '1',
      user: 'alice@example.com',
      language: 'python',
      submittedAt: new Date(),
      status: 'completed',
    },
    {
      id: '2',
      user: 'bob@example.com',
      language: 'javascript',
      submittedAt: new Date(Date.now() - 3600000),
      status: 'completed',
    },
  ];

  return (
    <div className="border-4 border-black overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b-4 border-black bg-gray-100">
          <tr>
            <th className="p-4 font-sans font-bold uppercase tracking-widest">User</th>
            <th className="p-4 font-sans font-bold uppercase tracking-widest">Language</th>
            <th className="p-4 font-sans font-bold uppercase tracking-widest">Submitted</th>
            <th className="p-4 font-sans font-bold uppercase tracking-widest">Status</th>
          </tr>
        </thead>
        <tbody>
          {mockData.map((item) => (
            <tr key={item.id} className="border-b-2 border-black last:border-b-0">
              <td className="p-4 font-mono text-sm">{item.user}</td>
              <td className="p-4 font-mono text-sm">{item.language}</td>
              <td className="p-4 font-mono text-sm">
                {format(item.submittedAt, 'yyyy-MM-dd HH:mm')}
              </td>
              <td className="p-4 font-mono text-sm capitalize">{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
