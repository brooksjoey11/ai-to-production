// src/pages/Admin.tsx
import AdminDashboard from '../features/admin/AdminDashboard';

export default function Admin() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b-4 border-black py-8">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="font-sans text-5xl font-black uppercase tracking-tighter">
            ADMIN COMMAND CENTER
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 md:px-8 py-12">
        <AdminDashboard />
      </main>
    </div>
  );
}
