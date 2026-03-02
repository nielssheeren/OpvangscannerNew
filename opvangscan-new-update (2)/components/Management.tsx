
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Student, AttendanceRecord, PricingConfig, CloudSyncState } from '../types';
import PricingSettings from './PricingSettings';
import { 
  FileUp, FileOutput, Download,
  Settings, Lock, ShieldCheck, MapPin, Globe, Key, Database, LayoutGrid, Terminal, LogOut, Trash2, Archive, Search, RotateCcw, User, Printer, Loader2, Info, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { format, subMonths, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';

interface ManagementProps {
  students: Student[];
  records: AttendanceRecord[];
  pricing: PricingConfig;
  onUpdatePricing: (config: PricingConfig) => void;
  onUpdateStudents: (updater: Student[] | ((prev: Student[]) => Student[])) => void;
  cloud: CloudSyncState;
  defaultConfig: { syncUrl: string; syncKey: string } | null;
  onSwitchSchool: () => void;
  onClearRecords: () => void;
  onRefreshData?: () => void;
  isSyncing?: boolean;
}

const Management: React.FC<ManagementProps> = ({ 
  students, records, pricing, onUpdatePricing, onUpdateStudents, cloud, defaultConfig, onSwitchSchool, onClearRecords, onRefreshData, isSyncing
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'admin' | 'archive' | 'it'>('admin');
  const [archiveSearch, setArchiveSearch] = useState('');
  
  const [localPricing, setLocalPricing] = useState<PricingConfig>(pricing);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmClearArchive, setConfirmClearArchive] = useState(false);
  const [isGeneratingBadges, setIsGeneratingBadges] = useState(false);
  const [selectedBadgeClass, setSelectedBadgeClass] = useState('Alle klassen');

  const effectiveUrl = defaultConfig?.syncUrl || 'Geen URL geconfigureerd';
  const effectiveKey = defaultConfig?.syncKey || '';

  const activeStudents = useMemo(() => students.filter(s => !s.isArchived), [students]);
  const archivedStudents = useMemo(() => students.filter(s => s.isArchived), [students]);
  const classes = useMemo(() => ['Alle klassen', ...Array.from(new Set(activeStudents.map(s => s.className)))].sort(), [activeStudents]);

  const filteredArchive = useMemo(() => 
    archivedStudents.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      s.className.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(archiveSearch.toLowerCase())
    )
  , [archivedStudents, archiveSearch]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1020') { setIsAuthenticated(true); setAuthError(false); setPassword(''); }
    else { setAuthError(true); setPassword(''); setTimeout(() => setAuthError(false), 500); }
  };

  const downloadExampleExcel = () => {
    const data = [{ 'Voornaam': 'Jan', 'Achternaam': 'Janssens', 'Klas': '1A', 'Stamboeknummer': '2023001', 'QRCode': '987654321' }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Voorbeeld");
    XLSX.writeFile(wb, "Voorbeeld_Import_Opvang.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        
        onUpdateStudents(prev => {
          let updated = [...prev];
          data.forEach(item => {
            const qr = String(item.QRCode || item.qrCode || "");
            if (!qr) return;
            const existingIdx = updated.findIndex(s => s.qrCode === qr);
            const studentData = {
              firstName: item.Voornaam || item.firstName || '?',
              lastName: item.Achternaam || item.lastName || '',
              className: item.Klas || item.class || '?',
              studentNumber: String(item.Stamboeknummer || item.studentNumber || ""),
              qrCode: qr,
              isArchived: false
            };
            if (existingIdx > -1) updated[existingIdx] = { ...updated[existingIdx], ...studentData };
            else updated.push({ id: crypto.randomUUID(), ...studentData });
          });
          return updated;
        });
        alert('Import voltooid.');
      } catch (err) { alert('Fout bij import.'); }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const filtered = records.filter(r => 
      isWithinInterval(new Date(r.timestamp), { 
        start: startOfDay(parseISO(startDate)), 
        end: endOfDay(parseISO(endDate)) 
      })
    );
    if (filtered.length === 0) { alert('Geen scans gevonden.'); return; }

    const wb = XLSX.utils.book_new();
    
    // TAB 1: Alle Registraties
    const detailData = filtered.map(r => {
      const s = students.find(st => st.id === r.studentId);
      const date = new Date(r.timestamp);
      const isWednesday = date.getDay() === 3;
      
      let price = 0;
      let sessionName = '';
      
      if (isWednesday) {
        if (r.session === 'MORNING') {
          price = pricing.wednesdayMorningPrice || pricing.morningPrice || 0;
          sessionName = 'Woensdag Ochtend';
        } else {
          price = pricing.wednesdayEveningPrice || pricing.eveningPrice || 0;
          sessionName = 'Woensdag Namiddag';
        }
      } else {
        if (r.session === 'MORNING') {
          price = pricing.morningPrice || 0;
          sessionName = 'Ochtend';
        } else {
          price = pricing.eveningPrice || 0;
          sessionName = 'Namiddag';
        }
      }

      return {
        'Stamboeknummer': s?.studentNumber || '',
        'Naam': `${s?.lastName || ''} ${s?.firstName || ''}`.trim(),
        'Klas': s?.className || '?',
        'Datum': format(date, 'dd/MM/yyyy'),
        'Tijd': format(date, 'HH:mm'),
        'Sessie': sessionName,
        'Bedrag (€)': price.toFixed(2)
      };
    }).sort((a, b) => a.Klas.localeCompare(b.Klas) || a.Naam.localeCompare(b.Naam));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailData), "Alle Registraties");

    // VERVOLGTABS: Per Klas
    const studentsWithScansInPeriod = Array.from(new Set(filtered.map(r => r.studentId)));
    const classesFound = Array.from(new Set(studentsWithScansInPeriod.map(id => students.find(s => s.id === id)?.className || '?'))).sort();

    classesFound.forEach(className => {
      const classStudents = studentsWithScansInPeriod.filter(id => (students.find(s => s.id === id)?.className || '?') === className);
      const classSummary = classStudents.map(id => {
        const s = students.find(st => st.id === id);
        
        const morning = filtered.filter(r => r.studentId === id && r.session === 'MORNING' && new Date(r.timestamp).getDay() !== 3).length;
        const evening = filtered.filter(r => r.studentId === id && r.session === 'EVENING' && new Date(r.timestamp).getDay() !== 3).length;
        const wedMorning = filtered.filter(r => r.studentId === id && r.session === 'MORNING' && new Date(r.timestamp).getDay() === 3).length;
        const wedEvening = filtered.filter(r => r.studentId === id && r.session === 'EVENING' && new Date(r.timestamp).getDay() === 3).length;
        
        const total = (morning * (pricing.morningPrice || 0)) + 
                      (evening * (pricing.eveningPrice || 0)) + 
                      (wedMorning * (pricing.wednesdayMorningPrice || 0)) + 
                      (wedEvening * (pricing.wednesdayEveningPrice || 0));

        return {
          'Stamboeknummer': s?.studentNumber || '',
          'Naam': `${s?.lastName || ''} ${s?.firstName || ''}`.trim(),
          'Klas': className,
          'Ochtend': morning,
          'Namiddag': evening,
          'Woensdag Ochtend': wedMorning,
          'Woensdag Namiddag': wedEvening,
          'Totaal Bedrag (€)': total.toFixed(2)
        };
      }).sort((a, b) => a.Naam.localeCompare(b.Naam));
      
      const ws = XLSX.utils.json_to_sheet(classSummary);
      XLSX.utils.book_append_sheet(wb, ws, `Klas ${className}`.slice(0, 31));
    });

    XLSX.writeFile(wb, `Opvang_Export_${startDate}.xlsx`);
  };

  const generateBadgesPDF = async (studentList: Student[], title: string) => {
    if (studentList.length === 0) return;
    setIsGeneratingBadges(true);
    try {
      const doc = new jsPDF();
      const margin = 10, spacing = 5, cols = 2, rows = 4;
      const bW = (doc.internal.pageSize.getWidth() - (margin * 2) - spacing) / cols;
      const bH = (doc.internal.pageSize.getHeight() - (margin * 2) - (spacing * 3)) / rows;
      const sorted = [...studentList].sort((a, b) => a.className.localeCompare(b.className) || a.lastName.localeCompare(b.lastName));

      for (let i = 0; i < sorted.length; i++) {
        const s = sorted[i];
        if (i % 8 === 0 && i !== 0) doc.addPage();
        const col = (i % 8) % 2, row = Math.floor((i % 8) / 2);
        const x = margin + (col * (bW + spacing)), y = margin + (row * (bH + spacing));
        doc.setDrawColor(220); doc.roundedRect(x, y, bW, bH, 3, 3);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(`${s.firstName} ${s.lastName}`, x + bW/2, y + 10, { align: 'center' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(`Klas: ${s.className} | Nr: ${s.studentNumber}`, x + bW/2, y + 18, { align: 'center' });
        const qr = await QRCode.toDataURL(s.qrCode, { margin: 1 });
        doc.addImage(qr, 'PNG', x + bW/2 - 20, y + 22, 40, 40);
      }
      doc.save(`Badges_${title}.pdf`);
    } finally { setIsGeneratingBadges(false); }
  };

  if (!isAuthenticated) return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-sm text-center">
        <Lock className="w-8 h-8 text-indigo-600 mx-auto mb-6" />
        <h2 className="text-2xl font-black mb-6">Beheer</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <input autoFocus type="password" placeholder="••••" className="w-full px-6 py-5 bg-slate-50 border-2 rounded-2xl text-center text-2xl font-black tracking-[1em]" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs">Ontgrendelen</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Beheer</h2>
          <p className="text-slate-400 font-bold">Instellingen & Export</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onSwitchSchool} className="bg-slate-100 text-slate-500 px-5 py-3 rounded-2xl text-[10px] font-black uppercase"><MapPin className="w-4 h-4 inline mr-1" /> School Wisselen</button>
          <button onClick={() => setIsAuthenticated(false)} className="bg-slate-100 text-slate-500 px-5 py-3 rounded-2xl text-[10px] font-black uppercase"><LogOut className="w-4 h-4 inline mr-1" /> Sluiten</button>
        </div>
      </header>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button onClick={() => setActiveSubTab('admin')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase ${activeSubTab === 'admin' ? 'bg-white shadow-md' : 'text-slate-400'}`}>Administratie</button>
        <button onClick={() => setActiveSubTab('archive')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase ${activeSubTab === 'archive' ? 'bg-white shadow-md' : 'text-slate-400'}`}>Archief ({archivedStudents.length})</button>
        <button onClick={() => setActiveSubTab('it')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase ${activeSubTab === 'it' ? 'bg-white shadow-md' : 'text-slate-400'}`}>Cloud Status</button>
      </div>

      {activeSubTab === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black">Studenten Import</h3>
                <div className="flex gap-2">
                  <button onClick={onRefreshData} className="bg-slate-100 p-2 rounded-xl"><RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /></button>
                  <button onClick={downloadExampleExcel} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Voorbeeld</button>
                </div>
              </div>
              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 mb-6">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-2">Verwachte kolomheaders:</p>
                <ul className="text-[10px] font-bold text-indigo-700/80 space-y-1 list-disc list-inside uppercase">
                  <li>Voornaam</li>
                  <li>Achternaam</li>
                  <li>Klas</li>
                  <li>Stamboeknummer</li>
                  <li>QRCode</li>
                </ul>
              </div>
              <label className="w-full border-2 border-dashed border-slate-100 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-slate-50/30 cursor-pointer hover:bg-slate-50 transition-colors">
                <FileUp className="w-8 h-8 text-slate-200 mb-2" />
                <span className="text-[10px] font-black uppercase text-slate-600">Selecteer Excel</span>
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              </label>
            </section>

            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black mb-6">Export Scans</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input type="date" className="p-4 bg-slate-50 rounded-2xl font-bold border border-slate-100 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <input type="date" className="p-4 bg-slate-50 rounded-2xl font-bold border border-slate-100 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <button onClick={handleExport} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"><Download className="w-4 h-4" /> Download Rapport</button>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black mb-6">Badges</h3>
              <div className="space-y-4">
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border border-slate-100" value={selectedBadgeClass} onChange={e => setSelectedBadgeClass(e.target.value)}>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => generateBadgesPDF(selectedBadgeClass === 'Alle klassen' ? activeStudents : activeStudents.filter(s => s.className === selectedBadgeClass), selectedBadgeClass)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Print Badges</button>
              </div>
            </section>

            <PricingSettings pricing={pricing} onUpdatePricing={onUpdatePricing} />
          </div>
        </div>
      )}

      {activeSubTab === 'archive' && (
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <Archive className="w-6 h-6 text-slate-400" />
            <h3 className="text-xl font-black">Archief</h3>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
            <input type="text" placeholder="Zoek in archief..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl font-bold outline-none" value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArchive.map(student => (
              <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400"><User /></div>
                  <div>
                    <p className="font-bold text-slate-800">{student.firstName} {student.lastName}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400">{student.className} • {student.studentNumber}</p>
                  </div>
                </div>
                <button onClick={() => onUpdateStudents(prev => prev.map(s => s.id === student.id ? { ...s, isArchived: false } : s))} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><RotateCcw className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSubTab === 'it' && (
        <section className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5"><Database className="w-48 h-48" /></div>
          <div className="relative z-10 space-y-10">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-500/20 w-14 h-14 rounded-2xl flex items-center justify-center"><Terminal className="w-7 h-7 text-indigo-400" /></div>
              <div>
                <h3 className="text-2xl font-black">Cloud Gegevens</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Systeem configuratie</p>
              </div>
            </div>
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] flex items-center gap-2"><Globe className="w-4 h-4" /> API Eindpunt</p>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 font-mono text-[11px] break-all text-slate-300">{effectiveUrl}</div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] flex items-center gap-2"><Key className="w-4 h-4" /> Beveiligingssleutel</p>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 font-mono text-sm text-slate-300 tracking-widest">
                  {effectiveKey ? '••••••••' + effectiveKey.slice(-4) : 'Niet ingesteld'}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${cloud.isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${cloud.isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                  {cloud.isConnected ? 'DATABASE VERBONDEN' : 'GEEN VERBINDING'}
                </div>
                {cloud.lastSync && (
                  <p className="text-[10px] font-black text-slate-500 uppercase">Laatste sync: <span className="text-slate-300">{format(new Date(cloud.lastSync), 'HH:mm:ss')}</span></p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Management;
