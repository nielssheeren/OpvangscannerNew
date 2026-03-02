
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Student } from '../types';
import { Search, UserPlus, Filter, Plus, X, Trash2, User, AlertCircle, Check, RotateCcw, Pencil, Save, RefreshCw, Camera, Sparkles, Archive, Hash } from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  onManualRegister: (studentId: string, date?: Date, session?: 'MORNING' | 'EVENING') => { success: boolean; message: string };
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onArchiveStudent: (id: string) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
  onRefreshData?: () => void;
  isSyncing?: boolean;
}

const StudentManager: React.FC<StudentManagerProps> = ({ 
  students, 
  onManualRegister, 
  onAddStudent,
  onArchiveStudent,
  onUpdateStudent,
  onRefreshData,
  isSyncing
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Alle klassen');
  const [feedback, setFeedback] = useState<{id: string, message: string, success: boolean} | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [manualEntryStudent, setManualEntryStudent] = useState<Student | null>(null);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualSession, setManualSession] = useState<'MORNING' | 'EVENING'>(new Date().getHours() < 12 ? 'MORNING' : 'EVENING');
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    firstName: '',
    lastName: '',
    className: '',
    qrCode: '',
    studentNumber: '',
    photo: ''
  });

  const activeStudents = students.filter(s => !s.isArchived);
  const classes = ['Alle klassen', ...Array.from(new Set(activeStudents.map(s => s.className)))].filter(Boolean).sort();

  const filteredStudents = activeStudents.filter(s => {
    const matchesSearch = 
      s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'Alle klassen' || s.className === selectedClass;
    return matchesSearch && matchesClass;
  });

  const startCamera = useCallback(async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 400, height: 400 } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setIsCameraActive(false);
      alert("Geen toegang tot de camera.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        if (showAddForm) setNewStudent(prev => ({ ...prev, photo: dataUrl }));
        else if (editingStudent) setEditingStudent(prev => prev ? ({ ...prev, photo: dataUrl }) : null);
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 300);
        stopCamera();
      }
    }
  }, [showAddForm, editingStudent, stopCamera]);

  const handleRegister = (id: string, date?: Date, session?: 'MORNING' | 'EVENING') => {
    const result = onManualRegister(id, date, session);
    setFeedback({ id, ...result });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEntryStudent) {
      // Use T12:00:00 to avoid timezone shifts causing the date to jump to the previous/next day
      handleRegister(manualEntryStudent.id, new Date(manualDate + 'T12:00:00'), manualSession);
      setManualEntryStudent(null);
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    onAddStudent({ ...newStudent, qrCode: newStudent.qrCode || `QR-${Date.now()}` });
    setNewStudent({ firstName: '', lastName: '', className: '', qrCode: '', studentNumber: '', photo: '' });
    setShowAddForm(false);
    stopCamera();
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      onUpdateStudent(editingStudent.id, editingStudent);
      setEditingStudent(null);
      stopCamera();
    }
  };

  return (
    <div className="space-y-6">
      <canvas ref={canvasRef} className="hidden" />
      {manualEntryStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Handmatige Registratie</h3>
              <button onClick={() => setManualEntryStudent(null)} className="text-slate-400 p-3 rounded-full hover:bg-slate-100"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                {manualEntryStudent.photo ? <img src={manualEntryStudent.photo} className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center"><User className="text-slate-400" /></div>}
                <div>
                  <p className="font-black text-slate-800">{manualEntryStudent.firstName} {manualEntryStudent.lastName}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Klas {manualEntryStudent.className}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Datum</label>
                  <input type="date" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sessie</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setManualSession('MORNING')} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${manualSession === 'MORNING' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>Ochtend</button>
                    <button type="button" onClick={() => setManualSession('EVENING')} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${manualSession === 'EVENING' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>Namiddag</button>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 active:scale-95 transition-all">Registreren</button>
            </form>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Leerlingen</h2>
          <p className="text-slate-500 font-medium mt-1">Beheer en handmatige registratie</p>
        </div>
        <div className="flex gap-3">
          {onRefreshData && (
            <button onClick={onRefreshData} disabled={isSyncing} className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-4 rounded-2xl font-black transition-all shadow-sm active:scale-95 text-[10px] uppercase tracking-widest">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sync API
            </button>
          )}
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 text-[10px] uppercase tracking-widest">
            <Plus className="w-5 h-5" /> Toevoegen
          </button>
        </div>
      </header>

      {(showAddForm || editingStudent) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-300">
            <div className="sticky top-0 p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-md z-10">
              <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{showAddForm ? 'Nieuwe Leerling' : 'Aanpassen'}</h3>
              <button onClick={() => { setShowAddForm(false); setEditingStudent(null); stopCamera(); }} className="text-slate-400 p-3 rounded-full hover:bg-slate-100"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={showAddForm ? handleAddStudent : handleUpdateStudent} className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                    {isCameraActive ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /> : 
                     (showAddForm ? newStudent.photo : editingStudent?.photo) ? <img src={showAddForm ? newStudent.photo : editingStudent?.photo} className="w-full h-full object-cover" alt="P" /> : 
                     <User className="w-12 h-12 text-slate-300" />}
                  </div>
                  <button type="button" onClick={isCameraActive ? capturePhoto : startCamera} className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-xl border-2 border-white shadow-lg"><Camera className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stamboeknr</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={showAddForm ? newStudent.studentNumber : editingStudent?.studentNumber} onChange={e => showAddForm ? setNewStudent({...newStudent, studentNumber: e.target.value}) : setEditingStudent({...editingStudent!, studentNumber: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Klas</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={showAddForm ? newStudent.className : editingStudent?.className} onChange={e => showAddForm ? setNewStudent({...newStudent, className: e.target.value}) : setEditingStudent({...editingStudent!, className: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voornaam</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={showAddForm ? newStudent.firstName : editingStudent?.firstName} onChange={e => showAddForm ? setNewStudent({...newStudent, firstName: e.target.value}) : setEditingStudent({...editingStudent!, firstName: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Achternaam</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={showAddForm ? newStudent.lastName : editingStudent?.lastName} onChange={e => showAddForm ? setNewStudent({...newStudent, lastName: e.target.value}) : setEditingStudent({...editingStudent!, lastName: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-indigo-100">Opslaan</button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input type="text" placeholder="Zoek op naam of stamboeknr..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="relative">
          <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select className="w-full pl-14 pr-10 py-4 bg-white border border-slate-200 rounded-2xl appearance-none font-black text-slate-700" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map(student => (
          <div key={student.id} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm relative group">
            <div className="flex items-center gap-4">
              <div className="relative">
                {student.photo ? <img src={student.photo} className="w-14 h-14 rounded-2xl object-cover" /> : 
                 <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300"><User className="w-7 h-7" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-900 truncate">{student.firstName} {student.lastName}</h4>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded uppercase">{student.className}</span>
                  <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-black rounded uppercase">#{student.studentNumber}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex gap-2">
                <button onClick={() => setManualEntryStudent(student)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 active:scale-90 transition-all"><UserPlus className="w-5 h-5" /></button>
                <button onClick={() => setEditingStudent(student)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100"><Pencil className="w-5 h-5" /></button>
              </div>
              <button onClick={() => onArchiveStudent(student.id)} className="p-3 text-slate-200 hover:text-amber-500"><Archive className="w-5 h-5" /></button>
            </div>
            {feedback?.id === student.id && (
              <div className={`absolute inset-0 z-10 flex items-center justify-center rounded-[2rem] text-white font-black uppercase tracking-widest text-[10px] ${feedback.success ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
                {feedback.message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentManager;
