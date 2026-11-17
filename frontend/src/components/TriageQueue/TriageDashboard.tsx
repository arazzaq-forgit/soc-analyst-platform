import React, { useState } from 'react';
import type { Alert, TriageStatus } from '../../types';
import { Search, Filter, ShieldAlert, AlertTriangle, ShieldCheck, Clock, ArrowRight, Eye, RotateCcw } from 'lucide-react';

interface TriageDashboardProps {
  alerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
  onOpenDetails: (alert: Alert) => void;
  onUpdateStatus: (alertId: string, status: TriageStatus) => void;
  onRefreshAlerts: () => void;
  loading: boolean;
}

export const TriageDashboard: React.FC<TriageDashboardProps> = ({
  alerts,
  onSelectAlert,
  onOpenDetails,
  onUpdateStatus: _onUpdateStatus,
  onRefreshAlerts,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Metrics
  const totalAlerts = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity_raw.toLowerCase() === 'critical' || a.severity_raw.toLowerCase() === 'high').length;
  const pendingCount = alerts.filter((a) => a.triage_status === 'pending').length;
  const filteredNoiseCount = alerts.filter((a) => (a.false_positive_score || 0) > 0.8 || a.triage_status === 'dismissed').length;

  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      a.alert_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.source_ip && a.source_ip.includes(searchTerm)) ||
      (a.mitre_technique && a.mitre_technique.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity = severityFilter === 'all' || a.severity_raw.toLowerCase() === severityFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || a.triage_status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSource = sourceFilter === 'all' || a.source.toLowerCase() === sourceFilter.toLowerCase();

    return matchesSearch && matchesSeverity && matchesStatus && matchesSource;
  });

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

  const getStatusBadge = (status: TriageStatus) => {
    switch (status) {
      case 'investigating':
        return 'bg-cyan-950 text-cyan-400 border-cyan-800 animate-pulse';
      case 'resolved':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'dismissed':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'cleared_threshold':
        return 'bg-purple-950 text-purple-400 border-purple-800';
      default:
        return 'bg-amber-950 text-amber-400 border-amber-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Queue Volume</p>
              <h3 className="text-2xl font-bold font-mono text-white mt-1">{totalAlerts}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Aggregated from SIEM, EDR & Cloud Audit</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Critical / High Threats</p>
              <h3 className="text-2xl font-bold font-mono text-red-400 mt-1">{criticalCount}</h3>
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-red-400/80 font-medium">Requires immediate Tier 2 investigation</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">ML Noise Reduction</p>
              <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">{filteredNoiseCount}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/80">Filtered by Ghouse ML triage model</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Awaiting Triage</p>
              <h3 className="text-2xl font-bold font-mono text-amber-400 mt-1">{pendingCount}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Inbound alerts ready for AI processing</div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search alert ID, asset, IP, MITRE..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Quick refresh */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              onClick={onRefreshAlerts}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center space-x-1 text-slate-400 font-mono">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">Status: All</option>
            <option value="pending">Pending</option>
            <option value="cleared_threshold">Cleared Threshold</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">Source: All</option>
            <option value="siem">SIEM</option>
            <option value="edr">EDR</option>
            <option value="cloud_audit">Cloud Audit</option>
          </select>

          {(severityFilter !== 'all' || statusFilter !== 'all' || sourceFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSeverityFilter('all');
                setStatusFilter('all');
                setSourceFilter('all');
                setSearchTerm('');
              }}
              className="text-cyan-400 hover:text-cyan-300 underline font-mono text-[11px] self-center ml-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Alert Feed Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Alert ID</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Asset & Source IP</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">MITRE ATT&CK</th>
                <th className="py-3 px-4">ML Triage Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                    No matching alerts found in current triage view.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-cyan-400">
                      {alert.alert_id}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-mono uppercase font-semibold ${getSeverityBadge(alert.severity_raw)}`}>
                        {alert.severity_raw}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div className="text-slate-200 font-medium">{alert.asset_id}</div>
                      <div className="text-[11px] text-slate-500">{alert.source_ip || alert.source}</div>
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate" title={alert.description}>
                      {alert.description}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {alert.mitre_technique ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                          {alert.mitre_technique}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="w-28">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                          <span>FP:</span>
                          <span className={(alert.false_positive_score || 0) < 0.2 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {((alert.false_positive_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              (alert.false_positive_score || 0) < 0.2 ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, (alert.false_positive_score || 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-mono uppercase ${getStatusBadge(alert.triage_status)}`}>
                        {alert.triage_status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenDetails(alert)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                          title="Inspect Alert & Raw Log"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => onSelectAlert(alert)}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded text-xs font-mono transition"
                          title="Investigate with RAG Agent"
                        >
                          <span>Investigate</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
