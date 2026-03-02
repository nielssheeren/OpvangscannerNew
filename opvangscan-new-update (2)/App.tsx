
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, QrCode, BarChart3, ShieldCheck, School, ChevronRight, LogOut, Loader2, RefreshCw } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import StudentManager from './components/StudentManager';
import Management from './components/Management';
import ConfirmationModal from './components/ConfirmationModal';
import { Student, AttendanceRecord, PricingConfig, CloudSyncState, AppData } from './types';

const SCHOOLS = ['Peter Benoit', 'Zennestraal', 'Kakelbont', 'Klavertje4', 'KSKA', 'Leidstar'] as const;
type SchoolName = typeof SCHOOLS[number];

const SCHOOL_DATA: Record<SchoolName, any> = {
  'Peter Benoit': { 
    primary: 'bg-indigo-600', 
    secondary: 'text-indigo-600',
    light: 'bg-indigo-50/50',
    accent: 'bg-indigo-100',
    border: 'border-indigo-100',
    syncUrl: 'https://script.google.com/macros/s/AKfycbxyahCyUSTx_YIIBrMTN22xXtMfOcCto-0OuOLLWtNXMzLtg9fJKWEKIPvQMEKkMdrUbQ/exec',
    syncKey: 'Benoit1020'
  },
  'Zennestraal': { 
    primary: 'bg-teal-600', 
    secondary: 'text-teal-600',
    light: 'bg-teal-50/50',
    accent: 'bg-teal-100',
    border: 'border-teal-100',
    syncUrl: 'https://script.google.com/macros/s/AKfycbzSv2zx6clv-lQ7q5pARzhtxMzdQusN-QHl6KpnJkauPJ1uYxn9Xz4uWZ2KEE8YsHE/exec',
    syncKey: 'Zennestraal1'
  },
  'Kakelbont': { 
    primary: 'bg-orange-600', 
    secondary: 'text-orange-600',
    light: 'bg-orange-50/50',
    accent: 'bg-orange-100',
    border: 'border-orange-100',
    syncUrl: 'https://script.google.com/macros/s/AKfycby0MiP7fMZYNJHNrDJc-nOhRSLH_1UOVyPOiljx2HUv0DTy0huR3ydT3QLIzw1zJyWW/exec',
    syncKey: 'Kakel123'
  },
  'Klavertje4': { 
    primary: 'bg-emerald-600', 
    secondary: 'text-emerald-600',
    light: 'bg-emerald-50/50',
    accent: 'bg-emerald-100',
    border: 'border-emerald-100',
    syncUrl: 'https://script.google.com/macros/s/AKfycby4N1OX4EmEi4KzJLxUR6k06JjM4JfEZM1tynoY3D7eLUu0q0DMbZnsRLswFM0fqXoT/exec',
    syncKey: 'Klav4Vier'
  },
  'KSKA': { 
    primary: 'bg-purple-600', 
    secondary: 'text-purple-600',
    light: 'bg-purple-50/50',
    accent: 'bg-purple-100',
    border: 'border-purple-100',
    syncUrl: 'https://script.google.com/macros/s/AKfycbxR8WnwK-NglCVgADgviAw0mpQrdP9dZY_xxBzc_QCdtbiTCYZWhEx_7Ip2YHk4MVHo/exec',
    syncKey: 'KSKAstrid'
  },
  'Leidstar': { 
    primary: 'bg-blue-700', 
    secondary: 'text-blue-700',
    light: 'bg-blue-50/50',
    accent: 'bg-blue-100',
    border: 'border-blue-100',
    syncUrl: 'https://script.google.com/macros/s/AKfycbwNHCSbHI0fYIxgOUPzRy2doy5gzDNIHh5uVBGMlwNz4cuicpmsW433jHnPUj-DIu3-7g/exec',
    syncKey: 'LeidSTAR'
  }
};

const App: React.FC = () => {
  const [selectedSchool, setSelectedSchool] = useState<SchoolName | null>(() => localStorage.getItem('opvangscan_selected_school') as SchoolName | null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scan' | 'students' | 'management'>('dashboard');
  const [students, setStudents] = useState<Student[]>(() => {
    const local = localStorage.getItem(`opvangscan_students_${selectedSchool}`);
    return local ? JSON.parse(local) : [];
  });
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const local = localStorage.getItem(`opvangscan_records_${selectedSchool}`);
    return local ? JSON.parse(local) : [];
  });
  const [pricing, setPricing] = useState<PricingConfig>(() => {
    const local = localStorage.getItem(`opvangscan_pricing_${selectedSchool}`);
    if (local) return JSON.parse(local);
    return { 
      morningPrice: 1.5, 
      eveningPrice: 1.5,
      wednesdayMorningPrice: 1.5,
      wednesdayEveningPrice: 1.5
    };
  });

  // Load data from local storage when school changes
  useEffect(() => {
    if (selectedSchool) {
      const s = localStorage.getItem(`opvangscan_students_${selectedSchool}`);
      const r = localStorage.getItem(`opvangscan_records_${selectedSchool}`);
      const p = localStorage.getItem(`opvangscan_pricing_${selectedSchool}`);
      
      if (s) setStudents(JSON.parse(s));
      else setStudents([]);
      
      if (r) setRecords(JSON.parse(r));
      else setRecords([]);
      
      if (p) setPricing(JSON.parse(p));
    }
  }, [selectedSchool]);

  // Persist to local storage whenever data changes
  useEffect(() => {
    if (selectedSchool) {
      localStorage.setItem(`opvangscan_students_${selectedSchool}`, JSON.stringify(students));
      localStorage.setItem(`opvangscan_records_${selectedSchool}`, JSON.stringify(records));
      localStorage.setItem(`opvangscan_pricing_${selectedSchool}`, JSON.stringify(pricing));
    }
  }, [students, records, pricing, selectedSchool]);
  const [isLoading, setIsLoading] = useState(false);
  const [cloud, setCloud] = useState<CloudSyncState>({ isConnected: false, isSyncing: false });

  // Confirmation Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'warning' | 'info' = 'danger') => {
    setModalConfig({ isOpen: true, title, message, onConfirm, variant });
  };

  const currentSchoolConfig = useMemo(() => selectedSchool ? SCHOOL_DATA[selectedSchool] : null, [selectedSchool]);

  const handleSwitchSchool = useCallback(() => {
    localStorage.removeItem('opvangscan_selected_school');
    setSelectedSchool(null);
    setStudents([]);
    setRecords([]);
    setCloud({ isConnected: false, isSyncing: false });
    setActiveTab('dashboard');
  }, []);

  const syncToCloud = useCallback(async (currStudents: Student[], currRecords: AttendanceRecord[], currPricing: PricingConfig) => {
    const targetUrl = currentSchoolConfig?.syncUrl;
    const targetKey = currentSchoolConfig?.syncKey;
    if (!targetUrl) return;
    
    setCloud(prev => ({ ...prev, isSyncing: true }));
    try {
      const appData: AppData = { students: currStudents, records: currRecords, pricing: currPricing, version: Date.now() };
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: targetKey, action: 'save', data: appData })
      });
      setCloud(prev => ({ ...prev, isSyncing: false, isConnected: true, lastSync: new Date().toISOString() }));
    } catch (err) { 
      setCloud(prev => ({ ...prev, isSyncing: false, error: 'Sync mislukt' })); 
    }
  }, [currentSchoolConfig]);

  const fetchFromCloud = useCallback(async (isBackground = false) => {
    const targetUrl = currentSchoolConfig?.syncUrl;
    const targetKey = currentSchoolConfig?.syncKey;
    if (!targetUrl) return;
    
    if (!isBackground) setIsLoading(true);
    setCloud(prev => ({ ...prev, isSyncing: true }));
    try {
      const res = await fetch(`${targetUrl}?key=${targetKey}&action=load`);
      const result = await res.json();
      if (result.success && result.data) {
        setStudents(prev => {
          const incoming = result.data.students || [];
          const updated = [...prev];
          incoming.forEach((inc: Student) => {
            const idx = updated.findIndex(s => s.qrCode === inc.qrCode);
            if (idx > -1) {
              updated[idx] = { ...inc, id: updated[idx].id, photo: updated[idx].photo || inc.photo };
            } else {
              updated.push(inc);
            }
          });
          return updated;
        });
        setRecords(prev => {
          const incoming = result.data.records || [];
          const updated = [...prev];
          incoming.forEach((inc: AttendanceRecord) => {
            if (!updated.some(r => r.id === inc.id)) {
              updated.push(inc);
            }
          });
          // Sort by timestamp descending
          return updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        });
        setPricing(prev => ({
          ...prev,
          ...(result.data.pricing || {})
        }));
        setCloud(prev => ({ ...prev, isConnected: true, isSyncing: false, lastSync: new Date().toISOString() }));
      }
    } catch (err) {
      setCloud(prev => ({ ...prev, isSyncing: false, error: 'Laden mislukt' }));
    } finally {
      setIsLoading(false);
    }
  }, [currentSchoolConfig]);

  useEffect(() => {
    if (selectedSchool) {
      localStorage.setItem('opvangscan_selected_school', selectedSchool);
      fetchFromCloud();
    }
  }, [selectedSchool, fetchFromCloud]);

  // Background sync every 30 seconds for multi-user coordination
  useEffect(() => {
    if (selectedSchool && cloud.isConnected) {
      const interval = setInterval(() => {
        fetchFromCloud(true);
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [selectedSchool, cloud.isConnected, fetchFromCloud]);

  // Debounced sync to cloud
  const syncTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const debouncedSync = useCallback((currStudents: Student[], currRecords: AttendanceRecord[], currPricing: PricingConfig) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncToCloud(currStudents, currRecords, currPricing);
    }, 2000); // Wait 2 seconds of inactivity before pushing
  }, [syncToCloud]);

  const addRecord = (studentId: string, customDate?: Date, customSession?: 'MORNING' | 'EVENING') => {
    const now = customDate || new Date();
    const session: 'MORNING' | 'EVENING' = customSession || (now.getHours() < 12 ? 'MORNING' : 'EVENING');
    
    if (records.some(r => r.studentId === studentId && new Date(r.timestamp).toDateString() === now.toDateString() && r.session === session)) {
      return { success: false, message: 'Reeds geregistreerd.' };
    }
    const newRecord = { id: crypto.randomUUID(), studentId, timestamp: now.toISOString(), session };
    const updated = [newRecord, ...records];
    setRecords(updated);
    // Immediate sync for multi-user visibility
    syncToCloud(students, updated, pricing);
    return { success: true, message: 'Geregistreerd!' };
  };

  if (!selectedSchool) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="max-w-xl w-full z-10 space-y-12">
          <div className="text-center space-y-4">
            <School className="w-16 h-16 text-white mx-auto mb-4" />
            <h1 className="text-5xl font-black text-white tracking-tighter">OpvangScan</h1>
            <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Kies uw locatie</p>
          </div>
          <div className="grid gap-4">
            {SCHOOLS.map(school => (
              <button key={school} onClick={() => setSelectedSchool(school)} className="bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-[2rem] text-white flex items-center justify-between transition-all group active:scale-95">
                <span className="text-2xl font-black">{school}</span>
                <ChevronRight className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className={`w-12 h-12 ${currentSchoolConfig?.secondary} animate-spin mb-4`} />
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Database laden...</h2>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentSchoolConfig?.light || 'bg-slate-50'} flex flex-col md:flex-row pb-24 md:pb-0 transition-colors duration-700`}>
      <header className={`md:hidden px-6 py-4 ${currentSchoolConfig?.primary} text-white flex justify-between items-center sticky top-0 z-[60] shadow-lg`}>
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl"><School className="w-4 h-4" /></div>
          <span className="font-black text-xs uppercase tracking-widest">{selectedSchool}</span>
        </div>
        <button onClick={handleSwitchSchool} title="Wissel van school" className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/10 active:scale-90 transition-all">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <nav className={`hidden md:flex w-72 ${currentSchoolConfig?.primary} text-white sticky top-0 h-screen flex-col shadow-2xl transition-all duration-500`}>
        <div className="p-8 flex items-center gap-3"><QrCode className="w-8 h-8" /><h1 className="text-xl font-black tracking-tighter">OpvangScan</h1></div>
        <div className="px-6 py-4 mb-4">
          <div className="p-4 bg-black/10 rounded-2xl border border-white/10">
            <p className="text-[9px] font-black uppercase text-white/50">{selectedSchool}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${cloud.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-[9px] font-black uppercase text-white/60">{cloud.isSyncing ? 'Sync...' : 'Verbonden'}</span>
            </div>
          </div>
        </div>
        <div className="px-4 space-y-2 flex-1 overflow-y-auto">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 className="w-5 h-5" />} label="Monitor" />
          <NavItem active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} icon={<QrCode className="w-5 h-5" />} label="Scanner" />
          <NavItem active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users className="w-5 h-5" />} label="Leerlingen" />
          <NavItem active={activeTab === 'management'} onClick={() => setActiveTab('management')} icon={<ShieldCheck className="w-5 h-5" />} label="Beheer" />
        </div>
        
        <div className="p-6 mt-auto border-t border-white/10">
          <button 
            onClick={handleSwitchSchool} 
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>School Wisselen</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-12 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard students={students} records={records} pricing={pricing} cloud={cloud} theme={currentSchoolConfig} onDeleteRecord={(id) => {
            openConfirm(
              'Registratie verwijderen',
              'Weet u zeker dat u deze registratie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
              () => {
                const updatedRecords = records.filter(r => r.id !== id);
                setRecords(updatedRecords);
                syncToCloud(students, updatedRecords, pricing);
              }
            );
          }} />}
          {activeTab === 'scan' && <Scanner students={students} records={records} onScan={addRecord} onUpdateStudent={(id, u) => {
            const updatedStudents = students.map(s => s.id === id ? {...s, ...u} : s);
            setStudents(updatedStudents);
            syncToCloud(updatedStudents, records, pricing);
          }} onAddStudent={(s) => { 
            const ns = {...s, id: crypto.randomUUID()};
            const updatedStudents = [...students, ns];
            setStudents(updatedStudents);
            syncToCloud(updatedStudents, records, pricing);
            return ns; 
          }} />}
          {activeTab === 'students' && <StudentManager students={students} onManualRegister={addRecord} onAddStudent={(s) => {
            const ns = {...s, id: crypto.randomUUID()};
            const updatedStudents = [...students, ns];
            setStudents(updatedStudents);
            syncToCloud(updatedStudents, records, pricing);
          }} onArchiveStudent={(id) => {
            openConfirm(
              'Leerling archiveren',
              'Weet u zeker dat u deze leerling wilt archiveren? De leerling zal niet meer zichtbaar zijn in de actieve lijst.',
              () => {
                const updatedStudents = students.map(s => s.id === id ? { ...s, isArchived: true } : s);
                setStudents(updatedStudents);
                syncToCloud(updatedStudents, records, pricing);
              },
              'warning'
            );
          }} onUpdateStudent={(id, u) => {
            const updatedStudents = students.map(s => s.id === id ? {...s, ...u} : s);
            setStudents(updatedStudents);
            syncToCloud(updatedStudents, records, pricing);
          }} onRefreshData={fetchFromCloud} isSyncing={cloud.isSyncing} />}
          {activeTab === 'management' && <Management 
            students={students} 
            records={records} 
            pricing={pricing} 
            onUpdatePricing={(p) => { 
              setPricing(p); 
              syncToCloud(students, records, p); 
            }} 
            onUpdateStudents={(updater) => {
              setStudents(prev => {
                const next = typeof updater === 'function' ? updater(prev) : updater;
                syncToCloud(next, records, pricing);
                return next;
              });
            }}
            cloud={cloud} 
            defaultConfig={currentSchoolConfig} 
            onSwitchSchool={handleSwitchSchool} 
            onClearRecords={() => { 
              openConfirm(
                'Alle scans wissen',
                'Weet u zeker dat u ALLE scans wilt wissen? Dit kan niet ongedaan worden gemaakt en alle data zal verloren gaan.',
                () => {
                  setRecords([]); 
                  syncToCloud(students, [], pricing); 
                }
              );
            }} 
            onRefreshData={fetchFromCloud}
            isSyncing={cloud.isSyncing}
          />}
        </div>
      </main>

      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        variant={modalConfig.variant}
      />

      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200 p-2.5 rounded-[2.5rem] flex justify-around shadow-2xl z-50">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 className="w-5 h-5" />} theme={currentSchoolConfig} />
        <MobileNavItem active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} icon={<QrCode className="w-5 h-5" />} theme={currentSchoolConfig} />
        <MobileNavItem active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users className="w-5 h-5" />} theme={currentSchoolConfig} />
        <MobileNavItem active={activeTab === 'management'} onClick={() => setActiveTab('management')} icon={<ShieldCheck className="w-5 h-5" />} theme={currentSchoolConfig} />
      </nav>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${active ? 'bg-white text-slate-900 shadow-xl' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>{icon} <span>{label}</span></button>
);

const MobileNavItem = ({ active, onClick, icon, theme }: any) => (
  <button onClick={onClick} className={`p-4 rounded-3xl transition-all duration-300 ${active ? theme?.primary + ' text-white shadow-xl scale-110' : 'text-slate-400'}`}>{icon}</button>
);

export default App;
