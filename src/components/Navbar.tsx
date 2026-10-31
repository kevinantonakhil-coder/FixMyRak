import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportService } from '../services/reportService';
import { UserNotification } from '../types';
import {
  MapPin,
  PlusCircle,
  Search,
  Bell,
  User as UserIcon,
  Shield,
  LogOut,
  Menu,
  X,
  Compass,
  Check,
  ExternalLink,
  MessageSquare,
  Info,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAuthModal: () => void;
  openReportModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openAuthModal,
}) => {
  const { user, userProfile, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  // Listen to in-app notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const unsub = reportService.subscribeNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (notifId: string) => {
    await reportService.markNotificationAsRead(notifId);
  };

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'explore', label: 'Explore Reports' },
    { id: 'map', label: 'Interactive Map' },
    { id: 'about', label: 'About & Transparency' },
    { id: 'feedback', label: 'Feedback' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#f6f7f3]/92 backdrop-blur-md border-b border-[#20362b]/8 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand matching website */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => {
              setCurrentTab('home');
              setMobileMenuOpen(false);
            }}
          >
            <img
              src="/assets/aistudio/FixMyRAK_Coastal_Community_Logo_d0e1428a.png"
              alt="FixMyRAK Logo"
              className="h-12 w-12 object-contain rounded-xl group-hover:scale-105 transition-transform drop-shadow-xs bg-white p-0.5 border border-[#e4e9e1]"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-[#143d35] font-manrope">
                  FixMy<span className="text-[#e97950]">RAK</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#e8f1e9] text-[#143d35] border border-[#143d35]/15 rounded-md">
                  UAE
                </span>
              </div>
              <p className="text-[10px] font-medium text-[#74817b] leading-none mt-0.5">
                Your Community. Your Voice. A Better RAK.
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setCurrentTab(link.id)}
                className={`text-xs font-bold transition-all cursor-pointer ${
                  currentTab === link.id
                    ? 'text-[#143d35] underline underline-offset-8 decoration-2 decoration-[#e97950]'
                    : 'text-[#78827d] hover:text-[#143d35]'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Action Buttons & Profile */}
          <div className="flex items-center gap-2.5">
            {/* Primary CTA: Report an Issue */}
            <button
              onClick={() => setCurrentTab('report')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#143d35] hover:bg-[#205347] active:scale-95 shadow-md shadow-[#143d35]/15 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#d7edbd]" />
              <span>Report an Issue</span>
            </button>

            {/* Notifications Bell (for signed in citizens) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setProfileDropdownOpen(false);
                  }}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 text-[10px] font-extrabold bg-red-500 text-white rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Drawer */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-emerald-600" />
                        In-App Notifications
                      </h4>
                      <span className="text-xs text-slate-500">
                        {unreadCount} unread
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 my-2">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No notifications yet. Status updates will appear here!
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`py-2.5 px-2 rounded-lg transition-colors ${
                              !notif.read ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-slate-800">
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <button
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="text-[10px] text-emerald-600 hover:underline shrink-0"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(notif.createdAt).toLocaleDateString()} &bull;{' '}
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin Badge Quick Link */}
            {isAdmin && (
              <button
                onClick={() => setCurrentTab('admin')}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin Panel
              </button>
            )}

            {/* User Auth / Profile Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(!profileDropdownOpen);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-800 max-w-[100px] truncate hidden sm:inline-block">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user.displayName || 'Citizen'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {user.email}
                      </p>
                      {isAdmin && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 rounded-full">
                          Administrator
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setCurrentTab('dashboard');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-slate-500" />
                      My Submissions & Profile
                    </button>

                    <button
                      onClick={() => {
                        setCurrentTab('report');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-600" />
                      Submit New Report
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setCurrentTab('admin');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4 text-purple-600" />
                        Admin Dashboard
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={async () => {
                        setProfileDropdownOpen(false);
                        await logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e4e9e1] bg-[#f6f7f3] px-4 pt-3 pb-5 space-y-2 shadow-lg">
          <div className="flex items-center gap-2.5 pb-2 mb-2 border-b border-[#e4e9e1]">
            <img
              src="/assets/aistudio/FixMyRAK_Coastal_Community_Logo_d0e1428a.png"
              alt="FixMyRAK"
              className="w-8 h-8 object-contain rounded-lg bg-white p-0.5 border border-[#e4e9e1]"
            />
            <span className="text-xs font-bold text-[#143d35]">FixMyRAK Navigation</span>
          </div>

          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setCurrentTab(link.id);
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                currentTab === link.id
                  ? 'text-[#143d35] bg-[#e8f1e9] font-bold border border-[#d7edbd]'
                  : 'text-[#1c302c] hover:bg-stone-100'
              }`}
            >
              {link.label}
            </button>
          ))}

          <button
            onClick={() => {
              setCurrentTab('report');
              setMobileMenuOpen(false);
            }}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-bold text-white bg-[#143d35] hover:bg-[#205347] cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#d7edbd]" />
            Report an Issue
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setCurrentTab('admin');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#143d35] bg-[#e8f1e9] hover:bg-[#d7edbd]/70 border border-[#d7edbd] cursor-pointer"
            >
              <Shield className="w-4 h-4 text-[#143d35]" />
              Admin Portal
            </button>
          )}
        </div>
      )}
    </header>
  );
};
