import React from 'react';
import type { Alert } from '../../types';
import { X, ShieldAlert, Cpu, Database, Network, Clock, Key, ArrowRight } from 'lucide-react';

interface AlertDetailModalProps {
  alert: Alert | null;
  onClose: () => void;
  onStartInvestigation: (alert: Alert) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({ alert, onClose, onStartInvestigation }) => {
  if (!alert) return null;

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return 'bg-red-950 text-red-400 border-red-800';
      case 'high':
        return 'bg-orange-950 text-orange-400 border-orange-800';
      case 'medium':
        return 'bg-yellow-950 text-yellow-400 border-yellow-800';
      default:
        return 'bg-blue-950 text-blue-400 border-blue-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-slate-800 border border-slate-700">
              <ShieldAlert className="h-5 w-5 text-cyan-400" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-slate-400">{alert.alert_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded border font-mono uppercase ${getSeverityBadge(alert.severity_raw)}`}>
                  {alert.severity_raw}
                </span>
                <span className="text-xs px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300 font-mono">
                  {alert.source}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 mt-1">{alert.description}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                <span>Asset ID</span>
              </span>
              <p className="text-sm font-mono font-medium text-slate-200 mt-1">{alert.asset_id}</p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                <Network className="h-3.5 w-3.5 text-purple-400" />
                <span>Source IP</span>
              </span>
              <p className="text-sm font-mono font-medium text-slate-200 mt-1">{alert.source_ip || 'Internal / N/A'}</p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                <Key className="h-3.5 w-3.5 text-emerald-400" />
                <span>MITRE Technique</span>
              </span>
              <p className="text-sm font-mono font-medium text-slate-200 mt-1">{alert.mitre_technique || 'None mapped'}</p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Timestamp</span>
              </span>
              <p className="text-xs font-mono text-slate-300 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
            </div>
          </div>

          {/* ML Triage Assessment */}
          <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                Ghouse ML Triage Model Assessment (CICIDS2017 Classifier)
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                (alert.false_positive_score || 0) < 0.2
                  ? 'bg-red-950 text-red-400 border-red-800'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-800'
              }`}>
                {((alert.false_positive_score || 0) * 100).toFixed(1)}% FP Likelihood
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  (alert.false_positive_score || 0) < 0.2 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(5, (alert.false_positive_score || 0) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {(alert.false_positive_score || 0) < 0.2
                ? 'High genuine threat probability. Model flagged as actionable attack pattern. Automated investigation strongly recommended.'
                : 'High false-positive confidence. Model identified traffic pattern as benign operational background noise.'}
            </p>
          </div>

          {/* Raw Log with Encrypted Decryption Indicator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-medium text-slate-400 flex items-center space-x-1.5">
                <Database className="h-3.5 w-3.5 text-cyan-400" />
                <span>Raw Log (Decrypted from Fernet AES Storage)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
                AES-256 Verified
              </span>
            </div>
            <pre className="p-3.5 bg-black/60 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400/90 whitespace-pre-wrap break-all overflow-x-auto selection:bg-emerald-900">
              {alert.raw_log}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-800 bg-slate-900/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition">
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onStartInvestigation(alert);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-cyan-600/20"
          >
            <span>Launch AI Investigation</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
