import React, { useState } from 'react';
import type { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Shield, CheckCircle2 } from 'lucide-react';
import { MOCK_USERS } from '../../services/mockData';

export const AdminUserPanel: React.FC = () => {
  const { demoMode, isBackendConnected } = useAuth();
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setLoading(true);
    setSuccessMsg(null);
    try {
      if (!demoMode && isBackendConnected) {
        await api.updateUserRole(userId, newRole);
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setSuccessMsg(`User role successfully updated to ${newRole}`);
    } catch (err: any) {
      alert(`Role update failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Shield className="h-5 w-5 text-purple-400" />
          <span>Role-Based Access Control (RBAC) Administration</span>
        </h2>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Manage system user authorization tiers. Protected by <code className="text-slate-300">require_role(Role.ADMIN)</code>.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-mono flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
            <tr>
              <th className="py-3 px-4">User ID</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Current Role</th>
              <th className="py-3 px-4 text-right">Update Permissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 text-slate-500">#{u.id}</td>
                <td className="py-3 px-4 font-semibold text-slate-200">{u.email}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded border text-[11px] uppercase font-bold ${
                      u.role === 'admin'
                        ? 'bg-purple-950 text-purple-400 border-purple-800'
                        : 'bg-blue-950 text-blue-400 border-blue-800'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {u.role === 'analyst' ? (
                      <button
                        onClick={() => handleRoleChange(u.id, 'admin')}
                        disabled={loading}
                        className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded transition"
                      >
                        Promote to Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(u.id, 'analyst')}
                        disabled={loading}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                      >
                        Demote to Analyst
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
