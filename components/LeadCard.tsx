import React from 'react';
import { Lead, LeadStatus } from '../types.ts';
import { Globe, Linkedin, CheckCircle, Clock, Search, Send, Loader2, AlertCircle } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onAnalyze: (id: string) => void;
  onApprove: (id: string) => void;
  loading: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onAnalyze, onApprove, loading }) => {
  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.NEW: return 'bg-blue-100 text-blue-700';
      case LeadStatus.ANALYZED: return 'bg-yellow-100 text-yellow-700';
      case LeadStatus.MESSAGED: return 'bg-emerald-100 text-emerald-700';
      case LeadStatus.REPLIED: return 'bg-purple-100 text-purple-700';
      case LeadStatus.HOT: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const isProcessing = lead.automation_status === 'sending';

  return (
    <div className={`bg-white border ${isProcessing ? 'border-blue-500 ring-2 ring-blue-50 shadow-xl' : 'border-slate-200'} rounded-3xl p-6 transition-all duration-500 relative overflow-hidden group`}>
      {isProcessing && (
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 overflow-hidden">
          <div className="h-full bg-white/30 animate-progress-indefinite w-1/3"></div>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            {lead.full_name}
            {lead.automation_status === 'sent' && <CheckCircle size={18} className="text-emerald-500" />}
          </h3>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-tight">{lead.title} @ {lead.company}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(lead.status)}`}>
            {lead.status}
          </span>
          {lead.automation_status !== 'none' && (
            <span className={`text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1 ${
              lead.automation_status === 'queued' ? 'text-blue-500' : 
              lead.automation_status === 'sending' ? 'text-orange-500 animate-pulse' : 
              lead.automation_status === 'sent' ? 'text-emerald-500' : 'text-slate-400'
            }`}>
              {lead.automation_status === 'sending' && <Loader2 size={10} className="animate-spin" />}
              Auto: {lead.automation_status}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-5 text-xs font-semibold">
        <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-slate-400 hover:text-blue-600 transition-colors">
          <Linkedin size={14} className="mr-1.5" />
          LinkedIn Profile
        </a>
        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-slate-400 hover:text-blue-600 transition-colors">
          <Globe size={14} className="mr-1.5" />
          Company Site
        </a>
      </div>

      {lead.pain_points && (
        <div className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SEO Pain Points</p>
          <p className="text-sm text-slate-700 leading-relaxed italic">{lead.pain_points}</p>
        </div>
      )}

      {lead.ai_message && (
        <div className="mb-6 group/msg relative">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Outreach Message Draft</p>
          <div className={`p-4 rounded-2xl border transition-all ${lead.approved ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-blue-50/30 border-blue-50 text-slate-800'} text-sm leading-relaxed relative`}>
             <span className="relative z-10">{lead.ai_message}</span>
             {lead.approved && !isProcessing && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
                   <CheckCircle size={14} />
                </div>
             )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {lead.status === LeadStatus.NEW && (
          <button
            onClick={() => onAnalyze(lead.id)}
            disabled={loading}
            className="flex-1 bg-slate-900 text-white text-sm font-black py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center disabled:opacity-50 active:scale-95"
          >
            {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Search size={18} className="mr-2" />}
            {loading ? 'Analyzing Site...' : 'Run SEO Audit'}
          </button>
        )}
        
        {lead.status === LeadStatus.ANALYZED && !lead.approved && (
          <button
            onClick={() => onApprove(lead.id)}
            className="flex-1 bg-emerald-600 text-white text-sm font-black py-4 rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center shadow-lg shadow-emerald-100 active:scale-95"
          >
            <CheckCircle size={18} className="mr-2" />
            Approve & Queue
          </button>
        )}

        {lead.approved && lead.automation_status === 'none' && (
           <div className="flex-1 flex flex-col items-center justify-center py-2 text-emerald-600 font-bold text-xs bg-emerald-50 rounded-2xl border border-emerald-100">
              <CheckCircle size={16} className="mb-1" />
              Ready for Campaign
           </div>
        )}

        {lead.automation_status === 'sent' && (
          <div className="flex-1 flex items-center justify-center py-4 bg-slate-100 rounded-2xl text-slate-500 font-black text-xs">
            MESSAGE DELIVERED
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadCard;