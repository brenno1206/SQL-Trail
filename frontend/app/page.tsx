'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import TeacherDashboard from '@/components/dashboards/TeacherDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

export default function DatabasePage() {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case 'student':
        return <StudentDashboard userName={user?.name || ''} />;
      case 'teacher':
        return <TeacherDashboard userName={user?.name || ''} />;
      case 'admin':
        return <AdminDashboard userName={user?.name || ''} />;
      default:
        return null;
    }
  };
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />

        <main className="grow container mx-auto px-4 py-12">
          {renderDashboard()}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
