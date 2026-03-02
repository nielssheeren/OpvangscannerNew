
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Student, AttendanceRecord } from '../types';
import { CheckCircle2, AlertCircle, RefreshCcw, User, Camera, Check, UserPlus, X, Sparkles, Clock, ChevronRight } from 'lucide-react';

type ScannerState = 'idle' | 'scanned' | 'capturing_photo' | 'confirmed' | 'unknown_qr' | 'already_registered';

interface ScannerProps {
  students: Student[];
  records: AttendanceRecord[];
  onScan: (studentId: string) => { success: boolean; message: string };
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
  onAddStudent: (student: Omit<Student, 'id'>) => Student;
}

const Scanner: React.FC<ScannerProps> = ({ students, records, onScan, onUpdateStudent, onAddStudent }) => {
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [unknownQRData, setUnknownQRData] = useState<string>('');
  const [newStudentForm, setNewStudentForm] = useState({ firstName: '', lastName: '', className: '' });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  
  const qrCodeInstance = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isStartingRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetScanner = useCallback(() => {
    setResult(null);
    setLastScannedStudent(null);
    setScannerState('idle');
    setUnknownQRData('');
    setCountdown(null);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    if (qrCodeInstance.current) {
      if (qrCodeInstance.current.getState() === 3) { // PAUSED
        try { qrCodeInstance.current.resume(); } catch (e) { console.warn(e); }
      }
    }
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    const student = students.find(s => s.qrCode === decodedText);
    
    if (qrCodeInstance.current && qrCodeInstance.current.getState() === 2) {
      qrCodeInstance.current.pause();
    }

    if (student) {
      const now = new Date();
      const currentSession = now.getHours() < 12 ? 'MORNING' : 'EVENING';
      const alreadyRegistered = records.some(r => 
        r.studentId === student.id && 
        new Date(r.timestamp).toDateString() === now.toDateString() && 
        r.session === currentSession
      );

      setLastScannedStudent(student);

      if (alreadyRegistered) {
        setScannerState('already_registered');
        setTimeout(() => resetScanner(), 3000);
        return;
      }

      setScannerState(student.photo ? 'scanned' : 'capturing_photo');
    } else {
      setUnknownQRData(decodedText);
      setScannerState('unknown_qr');
    }
  }, [students, records, resetScanner]);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    qrCodeInstance.current = html5QrCode;

    const startScanner = async () => {
      if (scannerState === 'idle' && !isStartingRef.current) {
        isStartingRef.current = true;
        try {
          await html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 20, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 },
            (text) => handleScanSuccess(text),
            () => {}
          );
        } catch (err) {
          console.error(err);
        } finally {
          isStartingRef.current = false;
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCode.getState() > 1) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [scannerState, handleScanSuccess]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current && lastScannedStudent) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onUpdateStudent(lastScannedStudent.id, { photo: dataUrl });
        setLastScannedStudent({ ...lastScannedStudent, photo: dataUrl });
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 200);
        setScannerState('scanned');
        setCountdown(null);
      }
    }
  }, [lastScannedStudent, onUpdateStudent]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (scannerState === 'capturing_photo' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.onloadedmetadata = () => {
              setCountdown(3);
              const timer = setInterval(() => {
                setCountdown(prev => {
                  if (prev !== null && prev <= 1) {
                    clearInterval(timer);
                    capturePhoto();
                    return 0;
                  }
                  return prev !== null ? prev - 1 : null;
                });
              }, 1000);
              countdownTimerRef.current = timer;
            };
          }
        })
        .catch(() => setScannerState('scanned'));
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [scannerState, capturePhoto]);

  const handleConfirm = () => {
    if (lastScannedStudent) {
      const outcome = onScan(lastScannedStudent.id);
      setResult(outcome);
      setScannerState('confirmed');
      setTimeout(() => resetScanner(), 2000);
    }
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const s = onAddStudent({ ...newStudentForm, qrCode: unknownQRData });
    setLastScannedStudent(s);
    setScannerState('capturing_photo');
    setNewStudentForm({ firstName: '', lastName: '', className: '' });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className={`bg-white rounded-[2.5rem] shadow-2xl border-4 transition-all duration-500 overflow-hidden relative min-h-[400px] flex flex-col items-center justify-center ${
        scannerState === 'idle' 
          ? (result && !result.success ? 'border-red-400' : 'border-indigo-100') 
          : scannerState === 'already_registered' ? 'border-red-500' : 'border-indigo-500'
      }`}>
        <div id="qr-reader" className={`w-full ${scannerState !== 'idle' ? 'opacity-10 grayscale' : 'opacity-100'}`}></div>
        
        {scannerState === 'idle' && !result && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-4 border-white/40 rounded-[3rem] border-dashed animate-pulse"></div>
            <div className="absolute bottom-10 px-6 py-2 bg-indigo-900/80 text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">Scan QR-code</div>
          </div>
        )}

        {showFlash && <div className="absolute inset-0 bg-white z-[60] animate-out fade-out duration-300 pointer-events-none" />}

        {/* Overlay voor gescande leerling info (Naam & Klas direct onder de scanner) */}
        {(scannerState === 'scanned' || scannerState === 'confirmed') && lastScannedStudent && (
          <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm z-20 flex flex-col justify-end p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  {lastScannedStudent.photo ? (
                    <img src={lastScannedStudent.photo} className="w-16 h-16 rounded-2xl object-cover shadow-lg border-2 border-slate-50" alt="L" />
                  ) : (
                    <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center text-slate-300 border-2 border-slate-50"><User className="w-8 h-8" /></div>
                  )}
                  {scannerState === 'confirmed' && result?.success && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-2 border-white shadow-lg"><Check className="w-3 h-3" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black text-slate-900 truncate leading-tight">{lastScannedStudent.firstName} {lastScannedStudent.lastName}</h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Klas {lastScannedStudent.className}</p>
                </div>
              </div>

              {scannerState === 'scanned' ? (
                <div className="flex gap-3">
                  <button onClick={handleConfirm} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                    Bevestigen <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={resetScanner} className="bg-slate-100 text-slate-400 px-5 rounded-xl hover:bg-slate-200 transition-all active:scale-95">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className={`py-4 px-6 rounded-xl text-center font-black text-[10px] uppercase tracking-widest animate-in zoom-in duration-300 ${result?.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {result?.message}
                </div>
              )}
            </div>
          </div>
        )}

        {scannerState === 'capturing_photo' && (
          <div className="absolute inset-0 bg-indigo-900/95 z-20 flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-black text-white mb-6">Even lachen!</h3>
            <div className="w-full max-w-xs aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl bg-black mb-8 relative">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {countdown !== null && countdown > 0 && <div className="absolute inset-0 flex items-center justify-center text-white text-8xl font-black">{countdown}</div>}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <button onClick={capturePhoto} className="w-full max-w-xs bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95">Nu foto maken</button>
          </div>
        )}

        {scannerState === 'unknown_qr' && (
          <div className="absolute inset-0 bg-indigo-900/95 z-20 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="bg-white rounded-[2rem] p-8 w-full shadow-2xl space-y-4">
              <h3 className="text-xl font-black text-slate-800">Nieuw kind</h3>
              <form onSubmit={handleCreateStudent} className="space-y-4 text-left">
                <input required placeholder="Voornaam" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={newStudentForm.firstName} onChange={e => setNewStudentForm({...newStudentForm, firstName: e.target.value})} />
                <input required placeholder="Achternaam" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={newStudentForm.lastName} onChange={e => setNewStudentForm({...newStudentForm, lastName: e.target.value})} />
                <input required placeholder="Klas" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={newStudentForm.className} onChange={e => setNewStudentForm({...newStudentForm, className: e.target.value})} />
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs">Foto maken</button>
                <button type="button" onClick={resetScanner} className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest py-2">Annuleren</button>
              </form>
            </div>
          </div>
        )}

        {scannerState === 'already_registered' && (
          <div className="absolute inset-0 bg-red-600 z-30 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in">
            <AlertCircle className="w-20 h-20 text-white mb-6 animate-pulse" />
            <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">AL AANWEZIG</h3>
            <p className="text-red-100 font-black text-sm uppercase tracking-widest mb-8">Deze leerling is reeds geregistreerd</p>
            
            {lastScannedStudent && (
              <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md flex items-center gap-4 border border-white/20 w-full max-w-xs">
                {lastScannedStudent.photo ? (
                  <img src={lastScannedStudent.photo} className="w-14 h-14 rounded-xl object-cover shadow-lg" alt="L" />
                ) : (
                  <div className="bg-white/10 w-14 h-14 rounded-xl flex items-center justify-center text-white/50"><User /></div>
                )}
                <div className="text-left">
                  <div className="font-black text-white truncate">{lastScannedStudent.firstName}</div>
                  <div className="text-[10px] font-black text-white/60 uppercase">Klas {lastScannedStudent.className}</div>
                </div>
              </div>
            )}
            
            <button onClick={resetScanner} className="mt-8 px-8 py-3 bg-white text-red-600 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl">Scanner Resetten</button>
          </div>
        )}

        {result && !result.success && scannerState === 'idle' && (
           <div className="absolute inset-0 bg-red-600 z-30 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in">
              <AlertCircle className="w-16 h-16 text-white mb-4" />
              <h3 className="text-xl font-black text-white mb-2 uppercase">Fout</h3>
              <p className="text-red-100 font-bold">{result.message}</p>
           </div>
        )}
      </div>

      <div className="flex justify-center pb-12">
        <button onClick={resetScanner} className="flex items-center gap-2 text-slate-300 font-black uppercase tracking-widest text-[9px] py-2 px-4 border border-slate-200 rounded-full active:scale-95 transition-all">
          <RefreshCcw className="w-3 h-3" /> Scanner resetten
        </button>
      </div>
    </div>
  );
};

export default Scanner;
