import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  DEFAULT_MPH_SETTINGS,
  MphAdvance,
  MphArrival,
  MphFarmer,
  MphJForm,
  MphOtherEntry,
  MphSettings,
} from '../../types/mandiPaddyHisab';
import {
  deleteMphAdvanceFromCloud,
  deleteMphArrivalFromCloud,
  deleteMphFarmerCascadeFromCloud,
  deleteMphJFormFromCloud,
  deleteMphOtherEntryFromCloud,
  loadLocalMphData,
  saveLocalMphAdvances,
  saveLocalMphArrivals,
  saveLocalMphFarmers,
  saveLocalMphJForms,
  saveLocalMphOtherEntries,
  saveLocalMphSettings,
  saveMphAdvanceToCloud,
  saveMphArrivalToCloud,
  saveMphFarmerToCloud,
  saveMphJFormToCloud,
  saveMphOtherEntryToCloud,
  saveMphSettingsToCloud,
  subscribeToMphCloudData,
  syncMphLocalDataToCloud,
} from '../../lib/mandiPaddyHisabDb';
import { MphLangProvider, useMphLang } from '../../lib/mandiPaddyHisabI18n';
import { MphConfirmModal } from './MphConfirmModal';
import { MphDashboard, MphTab } from './MphDashboard';
import { MphFarmerMasterView } from './MphFarmerMasterView';
import { MphArrivalView } from './MphArrivalView';
import { MphJFormView } from './MphJFormView';
import { MphAdvanceView } from './MphAdvanceView';
import { MphFarmerLedgerView } from './MphFarmerLedgerView';
import { MphReportsView } from './MphReportsView';
import { MphSettingsView } from './MphSettingsView';
import {
  BookOpen,
  CheckCircle2,
  CloudUpload,
  FileSpreadsheet,
  FileText,
  Languages,
  LayoutDashboard,
  Percent,
  RefreshCw,
  Settings,
  Users,
  Wheat,
} from 'lucide-react';

interface MandiPaddyHisabAppProps {
  user: User | null;
}

export const MandiPaddyHisabApp: React.FC<MandiPaddyHisabAppProps> = ({ user }) => {
  return (
    <MphLangProvider>
      <MandiPaddyHisabInner user={user} />
    </MphLangProvider>
  );
};

const MandiPaddyHisabInner: React.FC<MandiPaddyHisabAppProps> = ({ user }) => {
  const { lang, setLang, tr } = useMphLang();
  const [activeTab, setActiveTab] = useState<MphTab>('dashboard');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');

  // Independent state completely separate from existing KisanMitra ERP
  const initialLocal = loadLocalMphData();
  const [farmers, setFarmers] = useState<MphFarmer[]>(initialLocal.farmers);
  const [arrivals, setArrivals] = useState<MphArrival[]>(initialLocal.arrivals);
  const [jForms, setJForms] = useState<MphJForm[]>(initialLocal.jForms);
  const [otherEntries, setOtherEntries] = useState<MphOtherEntry[]>(initialLocal.otherEntries);
  const [advances, setAdvances] = useState<MphAdvance[]>(initialLocal.advances);
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
    saveLocalMphAdvances(advances);
  }, [advances]);
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
      localSnapshot.otherEntries.length > 0 ||
      localSnapshot.advances.length > 0;

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
      onAdvances: (cloudAdvances) => {
        if (cloudAdvances.length > 0 || !hasLocalRecords || hasMigrated) {
          setAdvances(cloudAdvances);
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
      showNotice(
        'error',
        tr('Please sign in with Google first for cloud sync.', 'ਕਲਾਊਡ ਸਿੰਕ ਲਈ ਪਹਿਲਾਂ ਉੱਪਰ Google Sign-In ਕਰੋ।')
      );
      return;
    }
    setIsSyncingLocal(true);
    try {
      const count = await syncMphLocalDataToCloud(user.uid, {
        farmers,
        arrivals,
        jForms,
        otherEntries,
        advances,
        settings,
      });
      showNotice(
        'success',
        tr(
          `${count} Mandi Paddy Hisab records synced to cloud.`,
          `Mandi Paddy Hisab ਦੇ ${count} ਰਿਕਾਰਡ ਕਲਾਊਡ ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਸਿੰਕ ਹੋ ਗਏ।`
        )
      );
    } catch (err) {
      console.error(err);
      showNotice(
        'error',
        tr('Cloud sync failed. Please check your connection.', 'ਕਲਾਊਡ ਸਿੰਕ ਫੇਲ੍ਹ ਹੋਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਇੰਟਰਨੈੱਟ ਚੈੱਕ ਕਰੋ।')
      );
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
      setAdvances((prev) =>
        prev.map((adv) => (adv.farmerId === farmer.id ? { ...adv, farmerName: farmer.name } : adv))
      );
    }

    if (user) {
      saveMphFarmerToCloud(user.uid, farmer).catch((err) => {
        console.error(err);
        showNotice(
          'error',
          tr('Error saving farmer to Firestore.', 'ਕਿਸਾਨ ਕਲਾਊਡ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵੇਲੇ ਗਲਤੀ ਆਈ।')
        );
      });
    }
    showNotice(
      'success',
      isEdit
        ? tr(`Farmer "${farmer.name}" updated.`, `ਕਿਸਾਨ "${farmer.name}" ਅੱਪਡੇਟ ਹੋ ਗਿਆ।`)
        : tr(`Farmer "${farmer.name}" added.`, `ਨਵਾਂ ਕਿਸਾਨ "${farmer.name}" ਦਰਜ ਹੋ ਗਿਆ।`)
    );
  };

  const handleDeleteFarmer = (farmer: MphFarmer) => {
    const linkedArrivals = arrivals.filter((a) => a.farmerId === farmer.id);
    const linkedJForms = jForms.filter((j) => j.farmerId === farmer.id);
    const linkedOthers = otherEntries.filter((o) => o.farmerId === farmer.id);
    const linkedAdvances = advances.filter((adv) => adv.farmerId === farmer.id);

    setConfirmState({
      isOpen: true,
      title: tr('Delete Farmer', 'ਕਿਸਾਨ ਹਟਾਓ'),
      tone: 'danger',
      confirmLabel: tr('Delete Permanently', 'ਪੱਕਾ ਹਟਾਓ'),
      message: tr(
        `Are you sure you want to delete farmer "${farmer.name}" (${farmer.village})?\n\nThis will also delete ${linkedArrivals.length} Paddy Arrivals, ${linkedJForms.length} J-Forms, ${linkedOthers.length} Other Entries, and ${linkedAdvances.length} Advances for this farmer.`,
        `ਕੀ ਤੁਸੀਂ ਕਿਸਾਨ "${farmer.name}" (${farmer.village}) ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?\n\nਇਸ ਨਾਲ ਇਸ ਕਿਸਾਨ ਦੀਆਂ ${linkedArrivals.length} ਝੋਨਾ ਆਵਕਾਂ, ${linkedJForms.length} ਜੇ-ਫਾਰਮ, ${linkedOthers.length} ਹੋਰ ਐਂਟਰੀਆਂ ਅਤੇ ${linkedAdvances.length} ਪੇਸ਼ਗੀਆਂ ਵੀ ਹਟ ਜਾਣਗੀਆਂ।`
      ),
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setFarmers((prev) => prev.filter((f) => f.id !== farmer.id));
        setArrivals((prev) => prev.filter((a) => a.farmerId !== farmer.id));
        setJForms((prev) => prev.filter((j) => j.farmerId !== farmer.id));
        setOtherEntries((prev) => prev.filter((o) => o.farmerId !== farmer.id));
        setAdvances((prev) => prev.filter((adv) => adv.farmerId !== farmer.id));
        if (selectedFarmerId === farmer.id) setSelectedFarmerId('');

        if (user) {
          deleteMphFarmerCascadeFromCloud(
            user.uid,
            farmer.id,
            linkedArrivals.map((a) => a.id),
            linkedJForms.map((j) => j.id),
            linkedOthers.map((o) => o.id),
            linkedAdvances.map((adv) => adv.id)
          ).catch(console.error);
        }
        showNotice('success', tr(`Farmer "${farmer.name}" removed.`, `ਕਿਸਾਨ "${farmer.name}" ਹਟਾ ਦਿੱਤਾ ਗਿਆ।`));
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
        showNotice('error', tr('Error saving paddy arrival to Firestore.', 'ਝੋਨਾ ਆਵਕ ਕਲਾਊਡ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵੇਲੇ ਗਲਤੀ ਆਈ।'));
      });
    }
    showNotice('success', isEdit ? tr('Paddy Arrival updated.', 'ਝੋਨਾ ਆਵਕ ਅੱਪਡੇਟ ਹੋ ਗਈ।') : tr('Paddy Arrival saved.', 'ਝੋਨਾ ਆਵਕ ਸੇਵ ਹੋ ਗਈ।'));
  };

  const handleDeleteArrival = (arrival: MphArrival) => {
    setConfirmState({
      isOpen: true,
      title: tr('Delete Paddy Arrival', 'ਝੋਨਾ ਆਵਕ ਹਟਾਓ'),
      tone: 'danger',
      confirmLabel: tr('Delete Entry', 'ਐਂਟਰੀ ਹਟਾਓ'),
      message: tr(
        `Delete paddy arrival for "${arrival.farmerName}" (${arrival.bags} Bags, ${arrival.paddyType})?`,
        `ਕੀ ਤੁਸੀਂ "${arrival.farmerName}" ਦੀ ਝੋਨਾ ਆਵਕ (${arrival.bags} ਗੱਟੇ, ${arrival.paddyType}) ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`
      ),
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setArrivals((prev) => prev.filter((a) => a.id !== arrival.id));
        if (user) {
          deleteMphArrivalFromCloud(user.uid, arrival.id).catch(console.error);
        }
        showNotice('success', tr('Paddy Arrival entry deleted.', 'ਝੋਨਾ ਆਵਕ ਐਂਟਰੀ ਹਟਾ ਦਿੱਤੀ ਗਈ।'));
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
        showNotice('error', tr('Error saving J-Form to Firestore.', 'ਜੇ-ਫਾਰਮ ਕਲਾਊਡ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵੇਲੇ ਗਲਤੀ ਆਈ।'));
      });
    }
    showNotice('success', isEdit ? tr('J-Form updated.', 'ਜੇ-ਫਾਰਮ ਅੱਪਡੇਟ ਹੋ ਗਿਆ।') : tr('J-Form saved.', 'ਜੇ-ਫਾਰਮ ਸੇਵ ਹੋ ਗਿਆ।'));
  };

  const handleDeleteJForm = (jForm: MphJForm) => {
    setConfirmState({
      isOpen: true,
      title: tr('Delete J-Form', 'ਜੇ-ਫਾਰਮ ਹਟਾਓ'),
      tone: 'danger',
      confirmLabel: tr('Delete J-Form', 'ਜੇ-ਫਾਰਮ ਹਟਾਓ'),
      message: tr(
        `Delete J-Form entry for "${jForm.farmerName}" (${jForm.bags} Bags)?`,
        `ਕੀ ਤੁਸੀਂ "${jForm.farmerName}" ਦਾ ਜੇ-ਫਾਰਮ (${jForm.bags} ਗੱਟੇ) ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`
      ),
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setJForms((prev) => prev.filter((j) => j.id !== jForm.id));
        if (user) {
          deleteMphJFormFromCloud(user.uid, jForm.id).catch(console.error);
        }
        showNotice('success', tr('J-Form entry deleted.', 'ਜੇ-ਫਾਰਮ ਐਂਟਰੀ ਹਟਾ ਦਿੱਤੀ ਗਈ।'));
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
        showNotice('error', tr('Error saving entry to Firestore.', 'ਐਂਟਰੀ ਕਲਾਊਡ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵੇਲੇ ਗਲਤੀ ਆਈ।'));
      });
    }
    showNotice('success', isEdit ? tr('Entry updated.', 'ਐਂਟਰੀ ਅੱਪਡੇਟ ਹੋ ਗਈ।') : tr('Expense / payment entry saved.', 'ਖਰਚ / ਅਦਾਇਗੀ ਐਂਟਰੀ ਸੇਵ ਹੋ ਗਈ।'));
  };

  const handleDeleteOtherEntry = (entry: MphOtherEntry) => {
    setConfirmState({
      isOpen: true,
      title: tr('Delete Entry', 'ਐਂਟਰੀ ਹਟਾਓ'),
      tone: 'danger',
      confirmLabel: tr('Delete', 'ਹਟਾਓ'),
      message: tr(
        `Delete "${entry.description}" (₹${entry.amount})?`,
        `ਕੀ ਤੁਸੀਂ "${entry.description}" (₹${entry.amount}) ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`
      ),
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setOtherEntries((prev) => prev.filter((o) => o.id !== entry.id));
        if (user) {
          deleteMphOtherEntryFromCloud(user.uid, entry.id).catch(console.error);
        }
        showNotice('success', tr('Entry deleted.', 'ਐਂਟਰੀ ਹਟਾ ਦਿੱਤੀ ਗਈ।'));
      },
    });
  };

  // Advances & Interest CRUD
  const handleSaveAdvance = (advance: MphAdvance) => {
    const isEdit = advances.some((a) => a.id === advance.id);
    setAdvances((prev) =>
      isEdit ? prev.map((a) => (a.id === advance.id ? advance : a)) : [advance, ...prev]
    );
    if (user) {
      saveMphAdvanceToCloud(user.uid, advance).catch((err) => {
        console.error(err);
        showNotice('error', tr('Error saving advance entry to Firestore.', 'ਪੇਸ਼ਗੀ ਐਂਟਰੀ ਕਲਾਊਡ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵੇਲੇ ਗਲਤੀ ਆਈ।'));
      });
    }
    showNotice(
      'success',
      isEdit ? tr('Advance & interest updated.', 'ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਅੱਪਡੇਟ ਹੋ ਗਏ।') : tr('Advance & interest saved.', 'ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਸੇਵ ਹੋ ਗਏ।')
    );
  };

  const handleDeleteAdvance = (advance: MphAdvance) => {
    setConfirmState({
      isOpen: true,
      title: tr('Delete Advance', 'ਪੇਸ਼ਗੀ ਹਟਾਓ'),
      tone: 'danger',
      confirmLabel: tr('Delete Advance', 'ਪੇਸ਼ਗੀ ਹਟਾਓ'),
      message: tr(
        `Delete advance for "${advance.farmerName}" (Principal ₹${advance.principalAmount} + Interest ₹${advance.interestAmount})?`,
        `ਕੀ ਤੁਸੀਂ "${advance.farmerName}" ਦੀ ਪੇਸ਼ਗੀ (ਮੂਲ ₹${advance.principalAmount} + ਵਿਆਜ ₹${advance.interestAmount}) ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`
      ),
      onConfirm: () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setAdvances((prev) => prev.filter((a) => a.id !== advance.id));
        if (user) {
          deleteMphAdvanceFromCloud(user.uid, advance.id).catch(console.error);
        }
        showNotice('success', tr('Advance entry deleted.', 'ਪੇਸ਼ਗੀ ਐਂਟਰੀ ਹਟਾ ਦਿੱਤੀ ਗਈ।'));
      },
    });
  };

  // Settings Save
  const handleSaveSettings = (nextSettings: MphSettings) => {
    setSettings(nextSettings);
    if (user) {
      saveMphSettingsToCloud(user.uid, nextSettings).catch((err) => {
        console.error(err);
        showNotice('error', tr('Error saving settings to Firestore.', 'ਸੈਟਿੰਗਾਂ ਕਲਾਊਡ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵੇਲੇ ਗਲਤੀ ਆਈ।'));
      });
    }
    showNotice('success', tr('Mandi Paddy Hisab rates and settings saved.', 'ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ ਰੇਟ ਅਤੇ ਸੈਟਿੰਗਾਂ ਸੇਵ ਹੋ ਗਈਆਂ।'));
  };

  const handleNavigate = (tab: MphTab, farmerId?: string) => {
    if (farmerId) setSelectedFarmerId(farmerId);
    setActiveTab(tab);
  };

  const navItems: Array<{ id: MphTab; label: string; count?: number; icon: React.ReactNode }> = [
    {
      id: 'dashboard',
      label: tr('Dashboard', 'ਡੈਸ਼ਬੋਰਡ'),
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'farmers',
      label: tr('Farmer Master', 'ਕਿਸਾਨ ਸੂਚੀ'),
      count: farmers.length,
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'arrivals',
      label: tr('Paddy Arrival', 'ਝੋਨਾ ਆਵਕ'),
      count: arrivals.length,
      icon: <Wheat className="w-4 h-4" />,
    },
    {
      id: 'jforms',
      label: tr('J-Form Entry', 'ਜੇ-ਫਾਰਮ'),
      count: jForms.length,
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'advances',
      label: tr('Advance & Interest', 'ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ'),
      count: advances.length,
      icon: <Percent className="w-4 h-4" />,
    },
    {
      id: 'ledger',
      label: tr('Farmer Account', 'ਕਿਸਾਨ ਹਿਸਾਬ'),
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: tr('Reports & PDF', 'ਰਿਪੋਰਟਾਂ ਅਤੇ PDF'),
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: tr('Settings', 'ਰੇਟ ਸੈਟਿੰਗ'),
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Independent Module Menu Bar */}
      <div className="print:hidden bg-white border border-slate-200 rounded-xl p-2 flex flex-col xl:flex-row xl:items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 xl:pb-0">
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

        <div className="flex items-center gap-2 self-end xl:self-auto shrink-0">
          {/* Language Switcher: English / ਪੰਜਾਬੀ */}
          <div
            className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5"
            title="Switch Language / ਭਾਸ਼ਾ ਬਦਲੋ"
          >
            <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                lang === 'en'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('pa')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                lang === 'pa'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ਪੰਜਾਬੀ
            </button>
          </div>

          {user && (
            <button
              type="button"
              onClick={handleManualCloudSync}
              disabled={isSyncingLocal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={tr('Upload local Mandi Paddy Hisab records to Firebase Firestore', 'ਲੋਕਲ ਰਿਕਾਰਡ ਕਲਾਊਡ ਵਿੱਚ ਅਪਲੋਡ ਕਰੋ')}
            >
              {isSyncingLocal ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span>{tr('Sync Cloud', 'ਕਲਾਊਡ ਸਿੰਕ')}</span>
            </button>
          )}
        </div>
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
          advances={advances}
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
          advances={advances}
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

      {activeTab === 'advances' && (
        <MphAdvanceView
          farmers={farmers}
          advances={advances}
          onSaveAdvance={handleSaveAdvance}
          onDeleteAdvance={handleDeleteAdvance}
          onGoToFarmers={() => setActiveTab('farmers')}
        />
      )}

      {activeTab === 'ledger' && (
        <MphFarmerLedgerView
          farmers={farmers}
          arrivals={arrivals}
          jForms={jForms}
          otherEntries={otherEntries}
          advances={advances}
          settings={settings}
          selectedFarmerId={selectedFarmerId}
          onSelectFarmerId={setSelectedFarmerId}
          onSaveOtherEntry={handleSaveOtherEntry}
          onDeleteOtherEntry={handleDeleteOtherEntry}
          onSaveAdvance={handleSaveAdvance}
          onDeleteAdvance={handleDeleteAdvance}
          onGoToArrivals={() => setActiveTab('arrivals')}
          onGoToJForms={() => setActiveTab('jforms')}
          onGoToAdvances={() => setActiveTab('advances')}
          onGoToFarmers={() => setActiveTab('farmers')}
        />
      )}

      {activeTab === 'reports' && (
        <MphReportsView
          farmers={farmers}
          arrivals={arrivals}
          jForms={jForms}
          otherEntries={otherEntries}
          advances={advances}
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
