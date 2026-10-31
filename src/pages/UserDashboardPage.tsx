import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Report, ReportStatus, UserNotification } from '../types';
import { reportService } from '../services/reportService';
import {
  User as UserIcon,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Bell,
  Calendar,
  MapPin,
  ExternalLink,
  Shield,
} from 'lucide-react';

interface UserDashboardPageProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  setCurrentTab: (tab: string) => void;
  openAuthModal: () => void;
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({
  reports,
  onSelectReport,
  setCurrentTab,
  openAuthModal,
}) => {
  const { user, userProfile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'reports' | 'profile'>('reports');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Sign in to View Dashboard</h2>
        <p className="text-xs text-slate-500">
          Track your submitted reports, view status progression updates, and manage notifications.
        </p>
        <button
          onClick={openAuthModal}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  // Filter reports submitted by current user
  const myReports = reports.filter((r) => r.userId === user.uid);

  // Compute metrics
  const totalMyReports = myReports.length;
  const underReviewCount = myReports.filter((r) => r.status === 'Under Review' || r.status === 'Submitted').length;
  const inProgressCount = myReports.filter((r) => r.status === 'In Progress').length;
  const resolvedCount = myReports.filter((r) => r.status === 'Resolved').length;

  const handleDelete = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this submitted report? This action cannot be undone.')) {
      return;
    }
    setDeletingId(reportId);
    try {
      await reportService.deleteReport(reportId);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete report.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'Submitted':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Under Review':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'In Progress':
        return 'bg-violet-100 text-violet-800 border-violet-300';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#f6f7f3]">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e4e9e1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-16 h-16 rounded-2xl object-cover shadow-xs border border-[#e4e9e1]"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#e8f1e9] text-[#143d35] font-extrabold text-2xl font-manrope flex items-center justify-center shadow-xs">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#143d35] font-manrope">
                {user.displayName || 'Community Member'}
              </h1>
              {isAdmin && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#efebf8] text-[#6b21a8] rounded-full border border-[#6b21a8]/20">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-[#74817b] mt-0.5">{user.email}</p>
            <p className="text-[11px] text-[#89958d] mt-1">
              Member since: {new Date(user.metadata.creationTime || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentTab('report')}
          className="px-5 py-2.5 rounded-xl bg-[#143d35] hover:bg-[#205347] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-[#d7edbd]" />
          <span>＋ Report an Issue</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e4e9e1] shadow-xs">
          <p className="text-xs font-bold text-[#819087] uppercase tracking-wider">
            Total Submitted
          </p>
          <p className="text-3xl font-extrabold text-[#143d35] font-manrope mt-1">{totalMyReports}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e4e9e1] shadow-xs">
          <p className="text-xs font-bold text-[#e97950] uppercase tracking-wider">
            Awaiting Review
          </p>
          <p className="text-3xl font-extrabold text-[#e97950] font-manrope mt-1">{underReviewCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e4e9e1] shadow-xs">
          <p className="text-xs font-bold text-[#6b21a8] uppercase tracking-wider">
            In Progress
          </p>
          <p className="text-3xl font-extrabold text-[#6b21a8] font-manrope mt-1">{inProgressCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e4e9e1] shadow-xs">
          <p className="text-xs font-bold text-[#143d35] uppercase tracking-wider">
            Resolved
          </p>
          <p className="text-3xl font-extrabold text-[#143d35] font-manrope mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e4e9e1] gap-4">
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'border-[#143d35] text-[#143d35]'
              : 'border-transparent text-[#74817b] hover:text-[#143d35]'
          }`}
        >
          My Submissions ({myReports.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'border-[#143d35] text-[#143d35]'
              : 'border-transparent text-[#74817b] hover:text-[#143d35]'
          }`}
        >
          Profile Information
        </button>
      </div>

      {/* Tab 1: My Reports List */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {myReports.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Reports Submitted Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Help improve Ras Al Khaimah infrastructure by reporting potholes, broken lights, or public facility issues.
              </p>
              <button
                onClick={() => setCurrentTab('report')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
              >
                Submit Your First Report
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {myReports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {report.imageURL ? (
                      <img
                        src={report.imageURL}
                        alt={report.title}
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <MapPin className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            report.status
                          )}`}
                        >
                          {report.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {report.category}
                        </span>
                      </div>

                      <h3
                        onClick={() => onSelectReport(report)}
                        className="text-sm font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                      >
                        {report.title}
                      </h3>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          {report.location}
                        </span>
                        <span>&bull;</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onSelectReport(report)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Track Details
                    </button>

                    {/* Allow user deletion only while Submitted */}
                    {report.status === 'Submitted' && (
                      <button
                        onClick={() => handleDelete(report.id)}
                        disabled={deletingId === report.id}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Profile Settings & Info */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
          <h3 className="text-base font-bold text-slate-900">
            Account Profile & Civic Standing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Display Name
              </span>
              <span className="font-semibold text-slate-800 text-sm">
                {user.displayName || 'Not specified'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Email Address
              </span>
              <span className="font-semibold text-slate-800 text-sm">
                {user.email}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Role & Permissions
              </span>
              <span className="font-semibold text-slate-800 text-sm">
                {isAdmin ? 'System Administrator' : 'Verified Community Member'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Firebase UID
              </span>
              <span className="font-mono text-slate-600 text-xs truncate block">
                {user.uid}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
