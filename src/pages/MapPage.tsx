import React, { useState, useMemo } from 'react';
import { Report, ReportCategory, ReportStatus, RAK_PRESET_LOCATIONS } from '../types';
import { MapComponent } from '../components/MapComponent';
import {
  MapPin,
  Filter,
  Layers,
  ChevronRight,
  Eye,
  Calendar,
  Clock,
  Compass,
} from 'lucide-react';

interface MapPageProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  setCurrentTab: (tab: string) => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  reports,
  onSelectReport,
  setCurrentTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('all');
  const [activeReport, setActiveReport] = useState<Report | null>(null);

  const categories: (ReportCategory | 'all')[] = [
    'all',
    'Roads and Potholes',
    'Streetlights',
    'Waste Management',
    'Pavements',
    'Public Facilities',
    'Other Infrastructure',
  ];

  const statuses: (ReportStatus | 'all')[] = [
    'all',
    'Submitted',
    'Under Review',
    'In Progress',
    'Resolved',
  ];

  // Filter reports with valid coordinates
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (!r.latitude || !r.longitude) return false;
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      return true;
    });
  }, [reports, selectedCategory, selectedStatus]);

  const handleMarkerClick = (report: Report) => {
    setActiveReport(report);
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'Submitted':
        return 'bg-amber-500';
      case 'Under Review':
        return 'bg-sky-500';
      case 'In Progress':
        return 'bg-violet-500';
      case 'Resolved':
        return 'bg-emerald-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f6f7f3]">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-[#819087] uppercase tracking-widest block mb-1">
            Geographic Explorer
          </span>
          <h1 className="text-3xl font-extrabold text-[#143d35] font-manrope tracking-tight mt-1">
            Interactive Ras Al Khaimah Map
          </h1>
          <p className="text-[#74817b] text-xs sm:text-sm">
            Live geographic distribution of community-reported infrastructure defects in RAK.
          </p>
        </div>

        <button
          onClick={() => setCurrentTab('report')}
          className="px-5 py-2.5 rounded-xl bg-[#143d35] hover:bg-[#205347] text-white font-bold text-xs shadow-sm self-start sm:self-auto transition-all cursor-pointer"
        >
          ＋ Report an Issue
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-[#e4e9e1] shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-[#819087] uppercase tracking-wider shrink-0">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#143d35] text-white shadow-xs'
                  : 'bg-[#f6f7f3] hover:bg-[#e8f1e9] text-[#1c302c] border border-[#e4e9e1]'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-[#819087] uppercase tracking-wider shrink-0">
            Status:
          </span>
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`whitespace-nowrap px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedStatus === st
                  ? 'bg-[#143d35] text-white shadow-xs'
                  : 'bg-[#f6f7f3] hover:bg-[#e8f1e9] text-[#1c302c] border border-[#e4e9e1]'
              }`}
            >
              {st === 'all' ? 'All' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Map + Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map View */}
        <div className="lg:col-span-3 space-y-3">
          <MapComponent
            reports={filteredReports}
            selectedReport={activeReport}
            onSelectReport={handleMarkerClick}
            height="620px"
            zoomLevel={11}
          />
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-800">{filteredReports.length}</strong> geocoded reports
            </span>
            <span className="text-slate-400">
              Click any pin to inspect details
            </span>
          </div>
        </div>

        {/* Report Preview Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {activeReport ? (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Selected Report
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${getStatusColor(
                    activeReport.status
                  )}`}
                >
                  {activeReport.status}
                </span>
              </div>

              {activeReport.imageURL && (
                <div className="h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={activeReport.imageURL}
                    alt={activeReport.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {activeReport.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2 leading-snug">
                  {activeReport.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-4 leading-relaxed">
                  {activeReport.description}
                </p>
              </div>

              <div className="pt-2 text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{activeReport.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(activeReport.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={() => onSelectReport(activeReport)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Open Full Report Timeline</span>
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Select a Marker on the Map
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click any status pin on the map to view incident photos, details, and municipal progress.
              </p>
            </div>
          )}

          {/* District Shortcut Quick Links */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-600" />
              Explore Key RAK Districts
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              {RAK_PRESET_LOCATIONS.slice(0, 5).map((loc) => (
                <div
                  key={loc.name}
                  onClick={() => {
                    const match = reports.find(
                      (r) =>
                        r.location.toLowerCase().includes(loc.name.split(' ')[0].toLowerCase())
                    );
                    if (match) {
                      setActiveReport(match);
                    }
                  }}
                  className="py-2 flex items-center justify-between text-slate-700 hover:text-emerald-700 cursor-pointer font-medium"
                >
                  <span className="truncate">{loc.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
