import React, { useState } from 'react';
import { XGBOOST_METRICS, LOGISTIC_REGRESSION_METRICS, ATTACK_CLASSES } from '../../services/mockData';
import { ShieldCheck, Zap, Layers } from 'lucide-react';

export const MLModelCenter: React.FC = () => {
  
  const [testPayload, setTestPayload] = useState({
    flowDuration: 1250,
    totalFwdPackets: 45,
    totalBwdPackets: 2,
    synFlagCount: 14,
    ackFlagCount: 0,
    flowBytesPerSec: 254000,
  });
  const [liveScore, setLiveScore] = useState<number | null>(null);

  const calculateLiveScore = () => {
    // Interactive scoring heuristic simulating Ghouse's trained XGBoost model
    let score = 0.95; // Default benign
    if (testPayload.synFlagCount > 5) score -= 0.6;
    if (testPayload.flowDuration < 500 && testPayload.totalFwdPackets > 20) score -= 0.3;
    if (testPayload.flowBytesPerSec > 100000) score -= 0.15;
    score = Math.max(0.01, Math.min(0.99, score));
    setLiveScore(score);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <h2 className="text-xl font-bold text-white">CICIDS2017 ML Triage & False-Positive Classifier</h2>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Engineered by <span className="text-cyan-400 font-semibold">Ghouse (ML / Triage Lead)</span> • Branch: <code className="text-slate-300">ghouse/false-positive-classifier</code>
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-lg text-xs font-mono font-bold">
              99.9% Model Accuracy
            </div>
            <div className="px-3 py-1.5 bg-cyan-950/80 border border-cyan-800 text-cyan-400 rounded-lg text-xs font-mono font-bold">
              78 Flow Features
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* XGBoost Baseline */}
        <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">Primary Production Model</span>
              <h3 className="text-lg font-bold text-white">{XGBOOST_METRICS.model}</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono font-bold">
              {(XGBOOST_METRICS.accuracy * 100).toFixed(1)}% Acc
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4 text-center">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">Attack Precision</span>
              <p className="text-sm font-bold font-mono text-emerald-400">{(XGBOOST_METRICS.attack_precision * 100).toFixed(2)}%</p>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">Attack Recall</span>
              <p className="text-sm font-bold font-mono text-cyan-400">{(XGBOOST_METRICS.attack_recall * 100).toFixed(2)}%</p>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">Attack F1-Score</span>
              <p className="text-sm font-bold font-mono text-purple-400">{(XGBOOST_METRICS.attack_f1 * 100).toFixed(2)}%</p>
            </div>
          </div>

          {/* Confusion Matrix */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase mb-2 flex justify-between">
              <span>Confusion Matrix (40,000 Test Samples)</span>
              <span className="text-emerald-400">FP Rate: 0.09%</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-500 block text-[10px]">True Negatives (Benign)</span>
                <span className="text-slate-200 font-bold">{XGBOOST_METRICS.true_negative.toLocaleString()}</span>
              </div>
              <div className="p-2 bg-red-950/40 border border-red-900/60 rounded">
                <span className="text-red-400 block text-[10px]">False Positives (Noise)</span>
                <span className="text-red-300 font-bold">{XGBOOST_METRICS.false_positive} only</span>
              </div>
              <div className="p-2 bg-yellow-950/40 border border-yellow-900/60 rounded">
                <span className="text-yellow-400 block text-[10px]">False Negatives (Missed)</span>
                <span className="text-yellow-300 font-bold">{XGBOOST_METRICS.false_negative}</span>
              </div>
              <div className="p-2 bg-emerald-950/40 border border-emerald-900/60 rounded">
                <span className="text-emerald-400 block text-[10px]">True Positives (Attacks)</span>
                <span className="text-emerald-300 font-bold">{XGBOOST_METRICS.true_positive.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logistic Regression Baseline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Comparative Baseline</span>
              <h3 className="text-lg font-bold text-slate-300">{LOGISTIC_REGRESSION_METRICS.model}</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-xs font-mono">
              {(LOGISTIC_REGRESSION_METRICS.accuracy * 100).toFixed(1)}% Acc
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4 text-center">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">Attack Precision</span>
              <p className="text-sm font-bold font-mono text-slate-300">{(LOGISTIC_REGRESSION_METRICS.attack_precision * 100).toFixed(2)}%</p>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">Attack Recall</span>
              <p className="text-sm font-bold font-mono text-slate-300">{(LOGISTIC_REGRESSION_METRICS.attack_recall * 100).toFixed(2)}%</p>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">Attack F1-Score</span>
              <p className="text-sm font-bold font-mono text-slate-300">{(LOGISTIC_REGRESSION_METRICS.attack_f1 * 100).toFixed(2)}%</p>
            </div>
          </div>

          {/* Comparison Note */}
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-2">
            <p>
              <strong className="text-slate-200">Ghouse Model Improvement:</strong> XGBoost achieved a <strong className="text-cyan-400">+18.2% boost in Attack F1</strong> and reduced false positive alarms by <strong className="text-emerald-400">97.3%</strong> compared to the logistic regression baseline.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Weight penalty (scale_pos_weight = 4.20) accounts for real-world benign vs attack class imbalance.
            </p>
          </div>
        </div>
      </div>

      {/* Attack Classes Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span>CICIDS2017 Multi-Class Attack Detection Breakdown</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">8 Evaluated Threat Classes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
              <tr>
                <th className="py-2.5 px-4">Attack Class Name</th>
                <th className="py-2.5 px-4">CICIDS2017 Dataset Split</th>
                <th className="py-2.5 px-4">Evaluated Flow Samples</th>
                <th className="py-2.5 px-4 text-right">Classifier Detection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {ATTACK_CLASSES.map((atk, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-semibold text-slate-200">{atk.name}</td>
                  <td className="py-2.5 px-4 text-slate-400">{atk.day}</td>
                  <td className="py-2.5 px-4 text-slate-400">{atk.samples.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      {atk.detectionRate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Packet / Flow Triage Tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Live Flow Feature Triage Bench</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Simulate Real-time Model Inference</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Flow Duration (ms)</label>
            <input
              type="number"
              value={testPayload.flowDuration}
              onChange={(e) => setTestPayload({ ...testPayload, flowDuration: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Total Fwd Packets</label>
            <input
              type="number"
              value={testPayload.totalFwdPackets}
              onChange={(e) => setTestPayload({ ...testPayload, totalFwdPackets: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Total Bwd Packets</label>
            <input
              type="number"
              value={testPayload.totalBwdPackets}
              onChange={(e) => setTestPayload({ ...testPayload, totalBwdPackets: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">SYN Flag Count</label>
            <input
              type="number"
              value={testPayload.synFlagCount}
              onChange={(e) => setTestPayload({ ...testPayload, synFlagCount: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">ACK Flag Count</label>
            <input
              type="number"
              value={testPayload.ackFlagCount}
              onChange={(e) => setTestPayload({ ...testPayload, ackFlagCount: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Bytes/sec</label>
            <input
              type="number"
              value={testPayload.flowBytesPerSec}
              onChange={(e) => setTestPayload({ ...testPayload, flowBytesPerSec: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setTestPayload({ flowDuration: 12000, totalFwdPackets: 8, totalBwdPackets: 12, synFlagCount: 1, ackFlagCount: 18, flowBytesPerSec: 1400 })}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono"
            >
              Preset: Benign Web Traffic
            </button>
            <button
              onClick={() => setTestPayload({ flowDuration: 120, totalFwdPackets: 1400, totalBwdPackets: 0, synFlagCount: 1400, ackFlagCount: 0, flowBytesPerSec: 940000 })}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-red-300 rounded text-xs font-mono"
            >
              Preset: SYN Flood Attack
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {liveScore !== null && (
              <div className="text-right font-mono text-xs">
                <span className="text-slate-400">Predicted False Positive: </span>
                <span className={`font-bold ${liveScore < 0.2 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(liveScore * 100).toFixed(1)}% ({liveScore < 0.2 ? 'ESCALATE ATTACK' : 'BENIGN NOISE'})
                </span>
              </div>
            )}
            <button
              onClick={calculateLiveScore}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-mono font-bold transition shadow-md shadow-cyan-600/20"
            >
              Run Triage Inference
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
