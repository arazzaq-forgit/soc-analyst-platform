import React, { useState } from 'react';
import type { Alert, AlertSource, AssetCriticality } from '../../types';
import { ATTACK_SCENARIO_PRESETS } from '../../services/mockData';
import { PlusCircle, Zap, CheckCircle } from 'lucide-react';

interface AlertIngestionHubProps {
  onIngestAlert: (alertData: Partial<Alert>) => Promise<void>;
}

export const AlertIngestionHub: React.FC<AlertIngestionHubProps> = ({ onIngestAlert }) => {
  const [source, setSource] = useState<AlertSource>('SIEM');
  const [sourceSystem, setSourceSystem] = useState('Elastic Security');
  const [severityRaw, setSeverityRaw] = useState('high');
  const [assetId, setAssetId] = useState('host-web-04');
  const [sourceIp, setSourceIp] = useState('194.26.29.112');
  const [assetCriticality, setAssetCriticality] = useState<AssetCriticality>('high');
  const [description, setDescription] = useState('Repeated SSH password authentication failures');
  const [mitreTechnique, setMitreTechnique] = useState('T1110');
  const [rawLog, setRawLog] = useState('sshd[4912]: Failed password for invalid user admin from 194.26.29.112 port 44102 ssh2 (x14 attempts in 2s)');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleApplyPreset = (preset: typeof ATTACK_SCENARIO_PRESETS[0]) => {
    setSource(preset.source);
    setSourceSystem(preset.source_system);
    setSeverityRaw(preset.severity);
    setAssetId(preset.asset_id);
    setSourceIp(preset.source_ip);
    setAssetCriticality(preset.asset_criticality);
    setDescription(preset.description);
    setMitreTechnique(preset.mitre === 'None' ? '' : preset.mitre);
    setRawLog(preset.raw_log);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);

    const generatedAlertId = `alrt_${Math.random().toString(36).substring(2, 10)}`;
    const payload: Partial<Alert> = {
      alert_id: generatedAlertId,
      timestamp: new Date().toISOString(),
      source,
      source_system: sourceSystem,
      severity_raw: severityRaw,
      asset_id: assetId,
      source_ip: sourceIp,
      asset_criticality: assetCriticality,
      description,
      mitre_technique: mitreTechnique || undefined,
      raw_log: rawLog,
      related_alert_ids: [],
    };

    try {
      await onIngestAlert(payload);
      setSuccessMsg(`Alert ${generatedAlertId} successfully ingested into the triage queue!`);
    } catch (err: any) {
      alert(`Ingestion failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <PlusCircle className="h-5 w-5 text-cyan-400" />
          <span>Security Alert Ingestion Gateway</span>
        </h2>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Direct ingestion endpoint conforming to <code className="text-slate-300">docs/alert-schema.json</code> with automatic AES encryption and ML triage scoring.
        </p>
      </div>

      {/* Preset Attacks Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Zap className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-mono uppercase font-bold text-slate-300">
            One-Click Attack Scenario Presets
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {ATTACK_SCENARIO_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">{preset.category}</span>
                <span className="text-[9px] font-mono text-slate-500">{preset.mitre}</span>
              </div>
              <h4 className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 line-clamp-1">{preset.name}</h4>
            </button>
          ))}
        </div>
      </div>

      {/* Ingestion Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
        {successMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-mono flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Source Pipeline</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as AlertSource)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="SIEM">SIEM</option>
              <option value="EDR">EDR</option>
              <option value="cloud_audit">Cloud Audit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Source System Tool</label>
            <input
              type="text"
              value={sourceSystem}
              onChange={(e) => setSourceSystem(e.target.value)}
              placeholder="Elastic Security, Suricata, WAF..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Raw Severity</label>
            <select
              value={severityRaw}
              onChange={(e) => setSeverityRaw(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Affected Asset ID</label>
            <input
              type="text"
              required
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="e.g. host-prod-web-01"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Source IP Address</label>
            <input
              type="text"
              value={sourceIp}
              onChange={(e) => setSourceIp(e.target.value)}
              placeholder="e.g. 203.0.113.19"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">MITRE ATT&CK Technique</label>
            <input
              type="text"
              value={mitreTechnique}
              onChange={(e) => setMitreTechnique(e.target.value)}
              placeholder="e.g. T1110, T1498"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">Description</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Human readable alert summary"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">
            Raw Log Line (Preserved verbatim for LLM evidence citations)
          </label>
          <textarea
            required
            rows={3}
            value={rawLog}
            onChange={(e) => setRawLog(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-emerald-400/90 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs rounded-lg transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
          >
            {loading ? 'Ingesting Alert...' : 'Ingest & Trigger ML Triage'}
          </button>
        </div>
      </form>
    </div>
  );
};
