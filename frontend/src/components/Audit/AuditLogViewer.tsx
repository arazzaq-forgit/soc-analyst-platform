import React from 'react';
import type { AuditLog } from '../../types';
import { ScrollText, Activity, BrainCircuit, User } from 'lucide-react';

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'ai_agent':
        return <BrainCircuit className="h-4 w-4 text-cyan-400" />;
      case 'system':
        return <Activity className="h-4 w-4 text-amber-400" />;
      default:
        return <User className="h-4 w-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <ScrollText className="h-5 w-5 text-cyan-400" />
          <span>SOC Platform Audit & Compliance Trail</span>
        </h2>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Cryptographically recorded actions, AI decisions, and triage outcomes across the platform.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Detail Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 text-slate-500">#{log.id}</td>
                  <td className="py-3 px-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5">
                      {getActorIcon(log.actor_type)}
                      <span className="capitalize text-slate-200">{log.actor_type}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400">
                      {log.event_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 max-w-md truncate">
                    <code>{JSON.stringify(log.detail)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
