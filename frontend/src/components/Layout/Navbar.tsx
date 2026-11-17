import React from 'react';
import { Shield, Activity, BrainCircuit, PlusCircle, Users, ScrollText, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, pendingCount, onOpenAuth }) => {
  const { user, isAdmin, isAuthenticated, logout, isBackendConnected, demoMode, setDemoMode, switchDemoRole } = useAuth();

  const navItems = [
    { id: 'triage', label: 'Triage Queue', icon: Activity, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'investigation', label: 'AI Investigation Studio', icon: BrainCircuit },
    { id: 'ml', label: 'ML Triage Engine', icon: ShieldCheck },
    { id: 'ingest', label: 'Ingest Alert', icon: PlusCircle },
    { id: 'audit', label: 'Audit Trail', icon: ScrollText },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin RBAC', icon: Users }] : []),
  ];

  return (
    <header className="border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('triage')}>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-lg tracking-wider text-slate-100">AEGIS</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">SOC // v2.0</span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">AI Triage & RAG Investigation</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/40 font-mono font-semibold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Status & Auth Area */}
          <div className="flex items-center space-x-3">
            {/* Backend Connectivity Status Pill */}
            <div
              className={`flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-mono border cursor-pointer transition-all ${
                isBackendConnected
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                  : 'bg-amber-950/60 text-amber-400 border-amber-800'
              }`}
              title={isBackendConnected ? 'Connected to FastAPI Backend at http://127.0.0.1:8000' : 'Backend offline - Running in Demo Simulation Mode'}
              onClick={() => setDemoMode(!demoMode)}
            >
              <span className={`h-2 w-2 rounded-full ${isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden sm:inline">
                {isBackendConnected ? 'LIVE API (8000)' : 'DEMO MODE'}
              </span>
            </div>

            {/* User Profile / Auth */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-200">{user.email.split('@')[0]}</div>
                  <div className="flex items-center justify-end space-x-1">
                    <span className={`text-[10px] font-mono uppercase px-1.5 rounded ${user.role === 'admin' ? 'bg-purple-950 text-purple-400 border border-purple-800' : 'bg-blue-950 text-blue-400 border border-blue-800'}`}>
                      {user.role}
                    </span>
                    {demoMode && (
                      <button
                        onClick={() => switchDemoRole(user.role === 'admin' ? 'analyst' : 'admin')}
                        className="text-[9px] text-cyan-400 underline hover:text-cyan-300 ml-1"
                        title="Toggle role for RBAC testing"
                      >
                        [swap]
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-md shadow-cyan-600/20"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
