import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Layout/Navbar';
import { TriageDashboard } from './components/TriageQueue/TriageDashboard';
import { AlertDetailModal } from './components/TriageQueue/AlertDetailModal';
import { InvestigationStudio } from './components/Investigation/InvestigationStudio';
import { MLModelCenter } from './components/MLTriage/MLModelCenter';
import { AlertIngestionHub } from './components/Ingestion/AlertIngestionHub';
import { AdminUserPanel } from './components/Admin/AdminUserPanel';
import { AuditLogViewer } from './components/Audit/AuditLogViewer';
import { AuthModal } from './components/Auth/AuthModal';
import type { Alert, Investigation, AuditLog, TriageStatus } from './types';
import { INITIAL_ALERTS, INITIAL_INVESTIGATIONS, MOCK_AUDIT_LOGS } from './services/mockData';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { demoMode, isBackendConnected } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('triage');
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [inspectingAlert, setInspectingAlert] = useState<Alert | null>(null);
  const [investigations, setInvestigations] = useState<Record<string, Investigation>>(INITIAL_INVESTIGATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Sync with live backend if connected
  const refreshAlerts = async () => {
    setLoading(true);
    try {
      if (!demoMode && isBackendConnected) {
        const liveAlerts = await api.getAlerts(100);
        if (liveAlerts && liveAlerts.length > 0) {
          setAlerts(liveAlerts);
        }
      }
    } catch (err) {
      console.warn('Backend sync failed, maintaining current alert queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAlerts();
  }, [demoMode, isBackendConnected]);

  const handleSelectAlertForInvestigation = (alert: Alert) => {
    setSelectedAlert(alert);
    setActiveTab('investigation');
  };

  const handleUpdateAlertStatus = (alertId: string, status: TriageStatus) => {
    setAlerts((prev) =>
      prev.map((a) => (a.alert_id === alertId ? { ...a, triage_status: status } : a))
    );
  };

  const handleSaveInvestigation = (inv: Investigation) => {
    setInvestigations((prev) => ({
      ...prev,
      [inv.alert_id]: inv,
    }));

    // Add audit log entry
    const newLog: AuditLog = {
      id: Date.now(),
      event_type: 'investigation_completed',
      actor_type: 'ai_agent',
      detail: {
        alert_id: inv.alert_id,
        confidence_score: inv.confidence_score,
        citations: inv.citations.length,
      },
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleIngestAlert = async (alertData: Partial<Alert>) => {
    // Generate simulated false positive score if not provided
    const simulatedFP = alertData.mitre_technique ? 0.03 : 0.89;
    const newAlert: Alert = {
      id: Date.now(),
      alert_id: alertData.alert_id || `alrt_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: alertData.timestamp || new Date().toISOString(),
      source: alertData.source || 'SIEM',
      source_system: alertData.source_system,
      severity_raw: alertData.severity_raw || 'high',
      asset_id: alertData.asset_id || 'unknown-host',
      source_ip: alertData.source_ip,
      asset_criticality: alertData.asset_criticality || 'medium',
      description: alertData.description || 'Security alert',
      mitre_technique: alertData.mitre_technique,
      raw_log: alertData.raw_log || '',
      related_alert_ids: alertData.related_alert_ids || [],
      false_positive_score: simulatedFP,
      triage_status: 'pending',
      created_at: new Date().toISOString(),
    };

    if (!demoMode && isBackendConnected) {
      await api.ingestAlert(newAlert);
    }

    setAlerts((prev) => [newAlert, ...prev]);

    // Add audit log
    const audit: AuditLog = {
      id: Date.now(),
      event_type: 'alert_ingested',
      actor_type: 'user',
      detail: {
        alert_id: newAlert.alert_id,
        source: newAlert.source,
        severity_raw: newAlert.severity_raw,
      },
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => [audit, ...prev]);
    setActiveTab('triage');
  };

  const pendingCount = alerts.filter((a) => a.triage_status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'triage' && (
          <TriageDashboard
            alerts={alerts}
            onSelectAlert={handleSelectAlertForInvestigation}
            onOpenDetails={(alert) => setInspectingAlert(alert)}
            onUpdateStatus={handleUpdateAlertStatus}
            onRefreshAlerts={refreshAlerts}
            loading={loading}
          />
        )}

        {activeTab === 'investigation' && (
          <InvestigationStudio
            alerts={alerts}
            selectedAlert={selectedAlert}
            onSelectAlert={setSelectedAlert}
            investigations={investigations}
            onSaveInvestigation={handleSaveInvestigation}
            onUpdateAlertStatus={handleUpdateAlertStatus}
          />
        )}

        {activeTab === 'ml' && <MLModelCenter />}

        {activeTab === 'ingest' && <AlertIngestionHub onIngestAlert={handleIngestAlert} />}

        {activeTab === 'audit' && <AuditLogViewer logs={auditLogs} />}

        {activeTab === 'admin' && <AdminUserPanel />}
      </main>

      {/* Modals */}
      <AlertDetailModal
        alert={inspectingAlert}
        onClose={() => setInspectingAlert(null)}
        onStartInvestigation={handleSelectAlertForInvestigation}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AEGIS SOC Analyst Platform • AI Alert Triage & RAG Investigation</span>
          <span className="text-slate-600">
            CICIDS2017 Classifier (Ghouse) • RAG Agent (Razzaq) • FastAPI Backend (Wahab)
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
