import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  DEFAULT_MPH_SETTINGS,
  MphArrival,
  MphFarmer,
  MphJForm,
  MphOtherEntry,
  MphSettings,
} from '../../types/mandiPaddyHisab';
import {
  deleteMphArrivalFromCloud,
  deleteMphFarmerCascadeFromCloud,
  deleteMphJFormFromCloud,
  deleteMphOtherEntryFromCloud,
  loadLocalMphData,
  saveLocalMphArrivals,
  saveLocalMphFarmers,
  saveLocalMphJForms,
  saveLocalMphOtherEntries,
  saveLocalMphSettings,
  saveMphArrivalToCloud,
  saveMphFarmerToCloud,
  saveMphJFormToCloud,
  saveMphOtherEntryToCloud,
  saveMphSettingsToCloud,
  subscribeToMphCloudData,
  syncMphLocalDataToCloud,
} from '../../lib/mandiPaddyHisabDb';
import { MphConfirmModal } from './MphConfirmModal';
import { MphDashboard, MphTab } from './MphDashboard';
import { MphFarmerMasterView } from './MphFarmerMasterView';
import { MphArrivalView } from './MphArrivalView';
import { MphJFormView } from './MphJFormView';
import { MphFarmerLedgerView } from './MphFarmerLedgerView';
import { MphReportsView } from './MphReportsView';
import { MphSettingsView } from './MphSettingsView';
import {
  BookOpen,
  CheckCircle2,
  CloudUpload,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Users,
  Wheat,
} from 'lucide-react';

interface MandiPaddyHisabAppProps {
  user: User | null;
}

export const MandiPaddyHisabApp: React.FC<MandiPaddyHisabAppProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<MphTab>('dashboard');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');

  // Independent state completely separate from existing KisanMitra ERP
  const initialLocal = loadLocalMphData();
  const [farmers, setFarmers] = useState<MphFarmer[]>(initialLocal.farmers);
  const [arrivals, setArrivals] = useState<MphArrival[]>(initialLocal.arrivals);
  const [jForms, setJForms] = useState<MphJForm[]>(initialLocal.jForms);
  const [otherEntries, setOtherEntries] = useState<MphOtherEntry[]>(initialLocal.otherEntries);
  const [settings, setSettings] = useState<MphSettings>(initialLocal.settings);

  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showNotice = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4500);
  }, []);

  // LocalStorage persistence cache
  useEffect(() => {
    saveLocalMphFarmers(farmers);
  }, [farmers]);
  useEffect(() => {
    saveLocalMphArrivals(arrivals);
  }, [arrivals]);
  useEffect(() => {
    saveLocalMphJForms(jForms);
  }, [jForms]);
  useEffect(() => {
    saveLocalMphOtherEntries(otherEntries);
  }, [otherEntries]);
  useEffect(() => {
    saveLocalMphSettings(settings);
  }, [settings]);

  // Firestore real-time subscription using existing Firebase Auth & DB architecture
  useEffect(() => {
    if (!user) return;
    let hasMigrated = false;

    const localSnapshot = loadLocalMphData();
    const hasLocalRecords =
      localSnapshot.farmers.length > 0 ||
      localSnapshot.arrivals.length > 0 ||
      localSnapshot.jForms.length > 0 ||
      localSnapshot.otherEntries.length > 0;

    const unsub = subscribeToMphCloudData(user.uid, {
      onFarmers: (cloudFarmers) => {
        if (cloudFarmers.length === 0 && hasLocalRecords && !hasMigrated) {
          hasMigrated = true;
          syncMphLocalDataToCloud(user.uid, localSnapshot).catch(console.error);
        } else {
          setFarmers(cloudFarmers);
        }
      },
      onArrivals: (cloudArrivals) => {
        if (cloudArrivals.length > 0 || !hasLocalRecords || hasMigrated) {
          setArrivals(cloudArrivals);
        }
      },
      onJForms: (cloudJForms) => {
        if (cloudJForms.length > 0 || !hasLocalRecords || hasMigrated) {
          setJForms(cloudJForms);
        }
      },
      onOtherEntries: (cloudOther) => {
        if (cloudOther.length > 0 || !hasLocalRecords || hasMigrated) {
          setOtherEntries(cloudOther);
        }
      },
      onSettings: (cloudSettings) => {
        setSettings(cloudSettings || DEFAULT_MPH_SETTINGS);
      },
    });

    return () => unsub();
  }, [user]);

  const handleManualCloudSync = async () => {
    if (!user) {
      showNotice('error', 'ਕਲਾਊਡ ਸਿੰਕ ਲਈ ਪਹਿਲਾਂ ਉੱਪਰ Google Sign-In ਕਰੋ।');
      return;
    }
    setIsSyncingLocal(true);
    try {
      const count = await syncMphLocalDataToCloud(user.uid, {
        farmers,
        arrivals,
        jForms,
        otherEntries,
        settings,
      });
      showNotice('success', `Mandi Paddy Hisab ਦੇ ${count} ਰਿਕਾਰਡ ਕਲਾਊਡ ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਸਿੰਕ ਹੋ ਗਏ।`);
    } catch (err) {
      console.error(err);
      showNotice('error', 'Cloud sync failed. Please check your connection.');
    } finally {
      setIsSyncingLocal(false);
    }
  };

  // Farmers CRUD
  const handleSaveFarmer = (farmer: MphFarmer) => {
    const isEdit = farmers.some((f) => f.id === farmer.id);
    setFarmers((prev) =>
      isEdit ? prev.map((f) => (f.id === farmer.id ? farmer : f)) : [farmer, ...prev]
    );

    // Keep farmerName snapshot synced across child records if farmer name was edited
    if (isEdit) {
      setArrivals((prev) =>
        prev.map((a) => (a.farmerId === farmer.id ? { ...a, farmerName: farmer.name } : a))
      );
      setJForms((prev) =>
        prev.map((j) => (j.farmerId === farmer.id ? { ...j, farmerName: farmer.name } : j))
      );
      setOtherEntries((prev) =>
        prev.map((o) => (o.farmerId === farmer.id ? { ...o, farmerName: farmer.name } : o))
      );
    }

    if (user) {
      saveMphFarmerToCloud(user.uid, farmer).catch((err) => {
        console.error(err);
        showNotice('error', 'Error saving farmer to Firestore.');
      });
    }
    showNotice('success', isEdit ? `Farmer "${farmer.name}" updated.` : `Farmer "${farmer.name}" added.`);
  };

  const handleDeleteFarmer = (farmer: MphFarmer) => {
    const linkedArrivals = arrivals.filter((a) => a.farmerId === farmer.id);
    const linkedJForms = jForms.filter((j) => j.farmerId === farmer.id);
    const linkedOthers = otherEntries.filter((o) => o.farmerId === farmer.id);

    setConfirmState({
      isOpen: true,
      title: 'Delete Farmer (ਕਿਸਾਨ ਹਟਾਓ)',
      tone: 'danger',
      confirmLabel: 'Delete Permanently',
      message: `Are you sure you want to delete farmer "${farmer.name}" (${farmer.village})?\n\nThis will also delete ${linkedArrivals.length} Paddy Arrivals, ${linkedJForms.length} J-Forms, and ${linkedOthers.length} Other Entries for this farmer.`,
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setFarmers((prev) => prev.filter((f) => f.id !== farmer.id));
        setArrivals((prev) => prev.filter((a) => a.farmerId !== farmer.id));
        setJForms((prev) => prev.filter((j) => j.farmerId !== farmer.id));
        setOtherEntries((prev) => prev.filter((o) => o.farmerId !== farmer.id));
        if (selectedFarmerId === farmer.id) setSelectedFarmerId('');

        if (user) {
          deleteMphFarmerCascadeFromCloud(
            user.uid,
            farmer.id,
            linkedArrivals.map((a) => a.id),
            linkedJForms.map((j) => j.id),
            linkedOthers.map((o) => o.id)
          ).catch(console.error);
        }
        showNotice('success', `Farmer "${farmer.name}" removed.`);
      },
    });
  };

  // Paddy Arrivals CRUD
  const handleSaveArrival = (arrival: MphArrival) => {
    const isEdit = arrivals.some((a) => a.id === arrival.id);
    setArrivals((prev) =>
      isEdit ? prev.map((a) => (a.id === arrival.id ? arrival : a)) : [arrival, ...prev]
    );
    if (user) {
      saveMphArrivalToCloud(user.uid, arrival).catch((err) => {
        console.error(err);
        showNotice('error', 'Error saving paddy arrival to Firestore.');
      });
    }
    showNotice('success', isEdit ? 'Paddy Arrival updated.' : 'Paddy Arrival saved.');
  };

  const handleDeleteArrival = (arrival: MphArrival) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Paddy Arrival (ਆਵਕ ਹਟਾਓ)',
      tone: 'danger',
      confirmLabel: 'Delete Entry',
      message: `Delete paddy arrival for "${arrival.farmerName}" (${arrival.bags} Bags, ${arrival.paddyType})?`,
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setArrivals((prev) => prev.filter((a) => a.id !== arrival.id));
        if (user) {
          deleteMphArrivalFromCloud(user.uid, arrival.id).catch(console.error);
        }
        showNotice('success', 'Paddy Arrival entry deleted.');
      },
    });
  };

  // J-Form CRUD
  const handleSaveJForm = (jForm: MphJForm) => {
    const isEdit = jForms.some((j) => j.id === jForm.id);
    setJForms((prev) =>
      isEdit ? prev.map((j) => (j.id === jForm.id ? jForm : j)) : [jForm, ...prev]
    );
    if (user) {
      saveMphJFormToCloud(user.uid, jForm).catch((err) => {
        console.error(err);
        showNotice('error', 'Error saving J-Form to Firestore.');
      });
    }
    showNotice('success', isEdit ? 'J-Form updated.' : 'J-Form saved.');
  };

  const handleDeleteJForm = (jForm: MphJForm) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete J-Form (ਜੇ-ਫਾਰਮ ਹਟਾਓ)',
      tone: 'danger',
      confirmLabel: 'Delete J-Form',
      message: `Delete J-Form entry for "${jForm.farmerName}" (${jForm.bags} Bags)?`,
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setJForms((prev) => prev.filter((j) => j.id !== jForm.id));
        if (user) {
          deleteMphJFormFromCloud(user.uid, jForm.id).catch(console.error);
        }
        showNotice('success', 'J-Form entry deleted.');
      },
    });
  };

  // Other Expenses / Payments CRUD
  const handleSaveOtherEntry = (entry: MphOtherEntry) => {
    const isEdit = otherEntries.some((o) => o.id === entry.id);
    setOtherEntries((prev) =>
      isEdit ? prev.map((o) => (o.id === entry.id ? entry : o)) : [entry, ...prev]
    );
    if (user) {
      saveMphOtherEntryToCloud(user.uid, entry).catch((err) => {
        console.error(err);
        showNotice('error', 'Error saving entry to Firestore.');
      });
    }
    showNotice('success', isEdit ? 'Entry updated.' : 'Expense / payment entry saved.');
  };

  const handleDeleteOtherEntry = (entry: MphOtherEntry) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Entry (ਐਂਟਰੀ ਹਟਾਓ)',
      tone: 'danger',
      confirmLabel: 'Delete',
      message: `Delete "${entry.description}" (₹${entry.amount})?`,
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setOtherEntries((prev) => prev.filter((o) => o.id !== entry.id));
        if (user) {
          deleteMphOtherEntryFromCloud(user.uid, entry.id).catch(console.error);
        }
        showNotice('success', 'Entry deleted.');
      },
    });
  };

  // Settings Save
  const handleSaveSettings = (nextSettings: MphSettings) => {
    setSettings(nextSettings);
    if (user) {
      saveMphSettingsToCloud(user.uid, nextSettings).catch((err) => {
        console.error(err);
        showNotice('error', 'Error saving settings to Firestore.');
      });
    }
    showNotice('success', 'Mandi Paddy Hisab rates and settings saved.');
  };

  const handleNavigate = (tab: MphTab, farmerId?: string) => {
    if (farmerId) setSelectedFarmerId(farmerId);
    setActiveTab(tab);
  };

  const navItems: Array<{ id: MphTab; label: string; count?: number; icon: React.ReactNode }> = [
    {
      id: 'dashboard',
      label: 'Dashboard (ਡੈਸ਼ਬੋਰਡ)',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'farmers',
      label: 'Farmer Master (ਕਿਸਾਨ)',
      count: farmers.length,
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'arrivals',
      label: 'Paddy Arrival (ਆਵਕ)',
      count: arrivals.length,
      icon: <Wheat className="w-4 h-4" />,
    },
    {
      id: 'jforms',
      label: 'J-Form Entry (ਜੇ-ਫਾਰਮ)',
      count: jForms.length,
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'ledger',
      label: 'Farmer Account (ਹਿਸਾਬ)',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: 'Reports & PDF (ਰਿਪੋਰਟਾਂ)',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings (ਰੇਟ ਸੈਟਿੰਗ)',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Independent Module Menu Bar */}
      <div className="print:hidden bg-white border border-slate-200 rounded-xl p-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`ml-0.5 text-[11px] font-mono tabular-nums ${
                      active ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    ({item.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {user && (
          <button
            type="button"
            onClick={handleManualCloudSync}
            disabled={isSyncingLocal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap self-end lg:self-auto shrink-0"
            title="Upload local Mandi Paddy Hisab records to Firebase Firestore"
          >
            {isSyncingLocal ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5 text-emerald-700" />
            )}
            <span>Sync Cloud</span>
          </button>
        )}
      </div>

      {/* Inline Status Notice */}
      {notice && (
        <div
          className={`print:hidden px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice.text}</span>
        </div>
      )}

      {/* Active Sub-View */}
      {activeTab === 'dashboard' && (
        <MphDashboard
          farmers={farmers}
          arrivals={arrivals}
          jForms={jForms}
          otherEntries={otherEntries}
          settings={settings}
          onNavigate={handleNavigate}
        />
      )}

      {activeTab === 'farmers' && (
        <MphFarmerMasterView
          farmers={farmers}
          arrivals={arrivals}
          jForms={jForms}
          otherEntries={otherEntries}
          settings={settings}
          onSaveFarmer={handleSaveFarmer}
          onDeleteFarmer={handleDeleteFarmer}
          onOpenLedger={(fId) => handleNavigate('ledger', fId)}
        />
      )}

      {activeTab === 'arrivals' && (
        <MphArrivalView
          farmers={farmers}
          arrivals={arrivals}
          settings={settings}
          onSaveArrival={handleSaveArrival}
          onDeleteArrival={handleDeleteArrival}
          onGoToFarmers={() => setActiveTab('farmers')}
          requestConfirm={(opts) =>
            setConfirmState({
              isOpen: true,
              title: opts.title,
              message: opts.message,
              confirmLabel: opts.confirmLabel,
              tone: opts.tone,
              onConfirm: () => {
                setConfirmState((s) => ({ ...s, isOpen: false }));
                opts.onConfirm();
              },
            })
          }
        />
      )}

      {activeTab === 'jforms' && (
        <MphJFormView
          farmers={farmers}
          jForms={jForms}
          settings={settings}
          onSaveJForm={handleSaveJForm}
          onDeleteJForm={handleDeleteJForm}
          onGoToFarmers={() => setActiveTab('farmers')}
          requestConfirm={(opts) =>
            setConfirmState({
              isOpen: true,
              title: opts.title,
              message: opts.message,
              confirmLabel: opts.confirmLabel,
              tone: opts.tone,
              onConfirm: () => {
                setConfirmState((s) => ({ ...s, isOpen: false }));
                opts.onConfirm();
              },
            })
          }
        />
      )}

      {activeTab === 'ledger' && (
        <MphFarmerLedgerView
          farmers={farmers}
          arrivals={arrivals}
          jForms={jForms}
          otherEntries={otherEntries}
          settings={settings}
          selectedFarmerId={selectedFarmerId}
          onSelectFarmerId={setSelectedFarmerId}
          onSaveOtherEntry={handleSaveOtherEntry}
          onDeleteOtherEntry={handleDeleteOtherEntry}
          onGoToArrivals={() => setActiveTab('arrivals')}
          onGoToJForms={() => setActiveTab('jforms')}
          onGoToFarmers={() => setActiveTab('farmers')}
        />
      )}

      {activeTab === 'reports' && (
        <MphReportsView
          farmers={farmers}
          arrivals={arrivals}
          jForms={jForms}
          otherEntries={otherEntries}
          settings={settings}
        />
      )}

      {activeTab === 'settings' && (
        <MphSettingsView settings={settings} onSaveSettings={handleSaveSettings} />
      )}

      {/* Confirmation Modal */}
      <MphConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        tone={confirmState.tone}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, isOpen: false }))}
      />
    </div>
  );
};
