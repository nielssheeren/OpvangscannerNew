
import React from 'react';
import { Student, AttendanceRecord, PricingConfig, CloudSyncState } from '../types';
import { Clock, Sun, Moon, User, Trash2, Zap, Cloud } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';

interface DashboardProps {
  students: Student[];
  records: AttendanceRecord[];
  pricing: PricingConfig;
  cloud: CloudSyncState;
  theme?: any;
  onDeleteRecord: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ students, records, pricing, cloud, theme, onDeleteRecord }) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentSession: 'MORNING' | 'EVENING' = currentHour < 12 ? 'MORNING' : 'EVENING';

  const todayRecords = records.filter(record => {
    const recordDate = new Date(record.timestamp);
    return isSameDay(recordDate, now) && record.session === currentSession;
  });

  const sortedRecords = [...todayRecords].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-8 relative">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700 relative">
        <div className="flex-1">
          <p className="text-slate-400 font-bold capitalize flex items-center gap-2">
            {format(now, "EEEE d MMMM", { locale: nl })}
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <span className={theme?.secondary || 'text-indigo-500'}>
              {currentSession === 'MORNING' ? 'Ochtendopvang' : 'Namiddagopvang'}
            </span>
          </p>
        </div>
        
        <div className="absolute top-0 right-0 md:relative md:top-auto md:right-auto animate-in zoom-in duration-500 delay-300">
          <div className={`p-2 rounded-full border shadow-sm transition-all duration-500 ${cloud.isConnected ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className={`w-3 h-3 rounded-full animate-pulse ${cloud.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-150 fill-mode-both">
          <StatCard 
            title="Aanwezig" 
            value={todayRecords.length} 
            subtitle={`Totaal voor deze sessie`}
            icon={currentSession === 'MORNING' ? <Sun className="w-8 h-8 text-amber-500" /> : <Moon className={`w-8 h-8 ${theme?.secondary || 'text-indigo-500'}`} />} 
            color={currentSession === 'MORNING' ? 'border-amber-100 bg-white' : `${theme?.border || 'border-indigo-100'} bg-white`}
          />
        </div>
        <div className="hidden md:block animate-in fade-in slide-in-from-right-4 duration-700 delay-300 fill-mode-both">
          <StatCard 
            title="Status" 
            value={cloud.isConnected ? "Online" : "Offline"} 
            subtitle={cloud.isConnected ? "Cloud-database is verbonden" : "Geen verbinding met database"}
            icon={cloud.isConnected ? <Zap className="w-8 h-8 text-emerald-500" /> : <Cloud className="w-8 h-8 text-red-500" />} 
            color={cloud.isConnected ? "border-emerald-100 bg-white" : "border-red-100 bg-white"}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-both">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
            <Clock className={`w-5 h-5 ${theme?.secondary || 'text-indigo-500'}`} />
            Recente scans
          </h3>
          <span className={`text-[10px] ${theme?.primary || 'bg-slate-900'} text-white px-3 py-1.5 rounded-xl font-black uppercase tracking-widest`}>
            {todayRecords.length} SCANS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Tijd</th>
                <th className="px-6 py-4">Naam</th>
                <th className="px-6 py-4">Klas</th>
                <th className="px-6 py-4 text-right">Beheer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Zap className="w-12 h-12 mb-2 text-slate-400" />
                      <p className="text-sm font-black uppercase tracking-widest">Wachten op eerste scan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRecords.map((record, index) => {
                  const student = students.find(s => s.id === record.studentId);
                  return (
                    <tr 
                      key={record.id} 
                      className="hover:bg-slate-50 transition-colors animate-in fade-in slide-in-from-left-2 duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <span className={`text-xs font-black ${theme?.secondary || 'text-indigo-600'}`}>
                          {format(new Date(record.timestamp), 'HH:mm')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {student?.photo ? (
                            <img src={student.photo} className="w-10 h-10 rounded-xl object-cover" alt="S" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                          <div className="font-bold text-slate-900">{student?.firstName} {student?.lastName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase">
                          {student?.className}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => onDeleteRecord(record.id)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon, color }: { title: string, value: string | number, subtitle: string, icon: React.ReactNode, color: string }) => (
  <div className={`p-8 rounded-[2.5rem] border transition-all hover:shadow-lg hover:scale-[1.02] group ${color}`}>
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-slate-400 font-black text-[10px] tracking-[0.2em] uppercase">{title}</p>
        <p className="text-5xl font-black text-slate-900 tracking-tighter">{value}</p>
        <p className="text-xs font-bold text-slate-400 mt-1">{subtitle}</p>
      </div>
      <div className="bg-slate-50/50 p-5 rounded-[1.5rem] shadow-inner group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
  </div>
);

export default Dashboard;
