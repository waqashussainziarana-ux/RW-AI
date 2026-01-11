
import React, { useState, useEffect, useRef } from 'react';
import { Lead, LeadStatus, AuditResult, AutomationStatus, DiscoveryResult } from './types';
import { analyzeWebsite, generateSalesMessage, discoverLeads } from './services/geminiService';
import LeadCard from './components/LeadCard';
import { 
  Plus, LayoutDashboard, Users, MessageSquare, BarChart3, 
  Search, Filter, ExternalLink, Linkedin, Play, Pause, 
  Zap, CheckCircle2, Inbox, TrendingUp, ArrowUpRight, Clock,
  Sparkles, Loader2, UserPlus, Globe, Megaphone, Target
} from 'lucide-react';

type View = 'dashboard' | 'targets' | 'automation' | 'inbox';

const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isCampaignActive, setIsCampaignActive] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResult[]>([]);
  const campaignTimerRef = useRef<number | null>(null);

  const [newLead, setNewLead] = useState<Partial<Lead>>({
    full_name: '',
    linkedin_url: '',
    title: '',
    company: '',
    website: '',
    country: 'United States',
    industry: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('agency_leads_v2');
    if (saved) {
      setLeads(JSON.parse(saved));
    }
  }, []);

  const saveLeads = (updated: Lead[]) => {
    setLeads(updated);
    localStorage.setItem('agency_leads_v2', JSON.stringify(updated));
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    const lead: Lead = {
      ...(newLead as Lead),
      id: Math.random().toString(36).substr(2, 9),
      status: LeadStatus.NEW,
      approved: false,
      ai_message: null,
      pain_points: null,
      automation_status: 'none',
      scheduled_at: null,
      created_at: new Date().toISOString()
    };
    saveLeads([lead, ...leads]);
    setIsModalOpen(false);
    setNewLead({ full_name: '', linkedin_url: '', title: '', company: '', website: '', country: 'United States', industry: '' });
  };

  const handleImportLead = (res: DiscoveryResult) => {
    const lead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      full_name: res.full_name,
      linkedin_url: res.linkedin_url,
      title: res.title,
      company: res.company,
      website: res.website,
      country: res.country,
      industry: res.industry,
      status: LeadStatus.NEW,
      approved: false,
      ai_message: null,
      pain_points: null,
      automation_status: 'none',
      scheduled_at: null,
      created_at: new Date().toISOString()
    };
    saveLeads([lead, ...leads]);
    setDiscoveryResults(prev => prev.filter(r => r.linkedin_url !== res.linkedin_url));
  };

  const handleDiscoverySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await discoverLeads(searchQuery);
      setDiscoveryResults(results);
    } catch (err) {
      alert("Intent Discovery failed. Google Search might be rate-limiting. Try again in a moment.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyze = async (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    setLoadingId(id);
    try {
      const audit: AuditResult = await analyzeWebsite(lead);
      const message = await generateSalesMessage(lead, audit);
      const updatedLeads = leads.map(l => 
        l.id === id ? { 
          ...l, 
          status: LeadStatus.ANALYZED, 
          pain_points: audit.pain_points.join(', '), 
          ai_message: message 
        } : l
      );
      saveLeads(updatedLeads);
    } catch (err) {
      alert("AI Agent failed to analyze. Try again.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleApprove = (id: string) => {
    const updatedLeads = leads.map(l => 
      l.id === id ? { ...l, approved: true, automation_status: 'queued' as AutomationStatus } : l
    );
    saveLeads(updatedLeads);
  };

  const startCampaign = async () => {
    if (isCampaignActive) {
      setIsCampaignActive(false);
      if (campaignTimerRef.current) window.clearTimeout(campaignTimerRef.current);
      return;
    }
    const queuedLeads = leads.filter(l => l.approved && l.automation_status === 'queued');
    if (queuedLeads.length === 0) {
      alert("Queue empty! Approve some drafts first.");
      return;
    }
    setIsCampaignActive(true);
    processNextInQueue();
  };

  const processNextInQueue = async () => {
    setLeads(currentLeads => {
      const nextLead = currentLeads.find(l => l.approved && l.automation_status === 'queued');
      if (!nextLead) {
        setIsCampaignActive(false);
        return currentLeads;
      }
      const processingLeads = currentLeads.map(l => 
        l.id === nextLead.id ? { ...l, automation_status: 'sending' as AutomationStatus } : l
      );
      const delay = 3000 + Math.random() * 5000;
      campaignTimerRef.current = window.setTimeout(() => {
        setLeads(finalLeads => {
           const updated = finalLeads.map(l => 
             l.id === nextLead.id ? { ...l, automation_status: 'sent' as AutomationStatus, status: LeadStatus.MESSAGED } : l
           );
           localStorage.setItem('agency_leads_v2', JSON.stringify(updated));
           if (isCampaignActive) setTimeout(processNextInQueue, 2000);
           return updated;
        });
      }, delay);
      return processingLeads;
    });
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10">
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter">RW Dashboard</h1>
              <p className="text-slate-500 text-lg font-medium mt-2">Intent-first outreach metrics.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
               {[
                 { label: 'Total Leads', val: leads.length, change: '+12%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                 { label: 'Outreach', val: leads.filter(l => l.automation_status === 'sent').length, change: '+8%', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                 { label: 'Analyzed', val: leads.filter(l => l.status !== LeadStatus.NEW).length, change: '+24%', icon: Search, color: 'text-amber-600', bg: 'bg-amber-50' },
                 { label: 'Hot Leads', val: leads.filter(l => l.status === LeadStatus.HOT).length, change: '+4%', icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
               ].map((stat, i) => (
                 <div key={i} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between">
                   <div className="flex justify-between items-start mb-4">
                     <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                        <stat.icon size={24} />
                     </div>
                   </div>
                   <div>
                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                     <p className="text-3xl font-black text-slate-900 mt-1">{stat.val}</p>
                   </div>
                 </div>
               ))}
            </div>

            <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden text-white mb-12">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10">
                <h3 className="text-3xl font-black mb-4 leading-tight">Automation Safety Active</h3>
                <p className="text-slate-400 mb-8 max-w-xl font-medium">The agent is currently using human-mimicry delays. No signals from LinkedIn or Facebook have triggered rate limits.</p>
                <div className="flex gap-4">
                  <div className="px-5 py-3 bg-white/10 rounded-2xl border border-white/10 text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" /> 0 Bans
                  </div>
                  <div className="px-5 py-3 bg-white/10 rounded-2xl border border-white/10 text-sm font-bold flex items-center gap-2">
                    <Clock size={16} className="text-blue-400" /> Next Batch: 2h 40m
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'targets':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Prospecting</h1>
                <p className="text-slate-500 text-lg font-medium mt-2">Find business owners who are actively looking for help.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-slate-950 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-3 shadow-2xl transition-all active:scale-95 group"
              >
                <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" /> Manual Add
              </button>
            </header>

            {/* LinkedIn Discovery Section */}
            <div className="bg-white rounded-[40px] p-10 mb-12 border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden relative">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-2xl opacity-60"></div>
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Target size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Intent Scouter Agent</h3>
                    <p className="text-slate-500 font-medium italic">Scanning social feeds for active requests (Excluding Freelancer marketplaces)...</p>
                  </div>
               </div>
               
               <form onSubmit={handleDiscoverySearch} className="flex gap-4 mb-10">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      type="text" 
                      placeholder="e.g. 'Looking for web developer' posts on LinkedIn" 
                      className="w-full pl-14 pr-6 py-6 bg-slate-50 border border-slate-200 rounded-[28px] outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 transition-all font-bold text-lg"
                    />
                  </div>
                  <button 
                    disabled={isSearching}
                    type="submit" 
                    className="bg-slate-900 text-white px-12 rounded-[28px] font-black shadow-xl flex items-center gap-3 transition-all disabled:opacity-50 hover:bg-slate-800"
                  >
                    {isSearching ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={20} />}
                    {isSearching ? 'Scouting Socials...' : 'Scan Interest'}
                  </button>
               </form>

               {discoveryResults.length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
                    {discoveryResults.map((res, i) => (
                      <div key={i} className="bg-slate-50 p-6 rounded-[32px] border border-slate-200 flex flex-col justify-between group hover:bg-white hover:border-blue-200 transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                              <Megaphone size={10} /> {res.source_platform}
                            </span>
                            <a href={res.linkedin_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors">
                              <Linkedin size={18} />
                            </a>
                          </div>
                          <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">{res.full_name}</h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-tight mb-4">{res.title} @ {res.company}</p>
                          
                          <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-600/10 mb-6">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Intent Detected</p>
                            <p className="text-sm text-slate-700 font-medium italic leading-relaxed">"{res.intent_signal}"</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleImportLead(res)}
                          className="w-full py-4 rounded-2xl bg-white border border-slate-200 font-black text-slate-900 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                          <UserPlus size={18} /> Inject to Pipeline
                        </button>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {leads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onAnalyze={handleAnalyze} onApprove={handleApprove} loading={loadingId === lead.id} />
              ))}
            </div>
          </div>
        );
      case 'automation':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <header className="mb-12">
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Automation Engine</h1>
              <p className="text-slate-500 text-lg font-medium mt-2">Managing the batch processing cycle.</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-4 h-4 rounded-full ${isCampaignActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Reach-out</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mb-10">
                      <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Approved & Queued</p>
                        <p className="text-5xl font-black text-blue-600">{leads.filter(l => l.approved && l.automation_status === 'queued').length}</p>
                      </div>
                      <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sent Successfully</p>
                        <p className="text-5xl font-black text-emerald-600">{leads.filter(l => l.automation_status === 'sent').length}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={startCampaign} className={`w-full py-6 rounded-[32px] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl ${isCampaignActive ? 'bg-rose-100 text-rose-600' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}>
                    {isCampaignActive ? <Pause size={32} /> : <Play size={32} />}
                    {isCampaignActive ? 'Kill Active Process' : 'Deploy Outreach Batch'}
                  </button>
               </div>

               <div className="bg-slate-950 rounded-[40px] p-8 text-white border border-slate-900 shadow-2xl overflow-hidden relative">
                  <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-600/20 to-transparent"></div>
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-6">Live Process Log</h4>
                  <div className="space-y-4 font-mono text-[10px] text-slate-400 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                    {leads.filter(l => l.automation_status !== 'none').map((l, i) => (
                      <div key={i} className="flex gap-3 border-l border-white/10 pl-4 py-1">
                        <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                        <span>{l.automation_status === 'sent' ? 'SUCCESS' : 'EXECUTING'} -> {l.full_name}</span>
                      </div>
                    ))}
                    {leads.filter(l => l.automation_status !== 'none').length === 0 && <div className="italic text-slate-700">No active processes...</div>}
                  </div>
               </div>
            </div>
          </div>
        );
      case 'inbox':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <header className="mb-12">
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Inbox AI</h1>
              <p className="text-slate-500 text-lg font-medium mt-2">Drafting contextual follow-ups for active conversations.</p>
            </header>
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-20 flex flex-col items-center justify-center text-center">
               <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare size={48} className="text-rose-500" />
               </div>
               <h3 className="text-2xl font-black text-slate-900">Queue is Clear</h3>
               <p className="text-slate-500 font-medium mt-2 max-w-sm">When leads reply to your LinkedIn message, the AI will pull them here to help you close the deal.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-blue-100 selection:text-blue-900">
      <aside className="w-full md:w-72 bg-slate-950 text-slate-300 p-8 flex flex-col border-r border-slate-900 shrink-0">
        <div className="flex items-center gap-4 text-white mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl shadow-blue-500/20">RW</div>
          <div className="flex flex-col">
            <span className="font-black text-xl leading-none tracking-tight">RW Agency</span>
            <span className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1.5">INTENT AGENT v3.0</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-3">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'targets', label: 'Discovery', icon: Target },
            { id: 'automation', label: 'Campaigns', icon: Zap },
            { id: 'inbox', label: 'Inbox AI', icon: MessageSquare },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold border ${
                activeView === item.id 
                ? 'bg-white/10 text-white border-white/10 shadow-lg' 
                : 'hover:bg-white/5 text-slate-500 border-transparent'
              }`}
            >
              <item.icon size={20} className={activeView === item.id ? 'text-blue-500' : ''} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-900">
           <div className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-white font-black text-sm">RW</div>
              <div className="flex flex-col overflow-hidden">
                 <p className="text-sm font-black text-white truncate">Rana Waqas</p>
                 <div className="flex gap-3 mt-1.5">
                    <a href="https://pk.linkedin.com/in/ranawaqasdotcom" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors">
                      <Linkedin size={16} />
                    </a>
                 </div>
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-8 md:p-12">
        {renderView()}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manual Injection</h2>
                <p className="text-slate-500 font-medium mt-1">Directly add a prospect to the audit cycle.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors font-bold text-xl">✕</button>
            </div>
            <form onSubmit={handleAddLead} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Full Name</label>
                  <input required value={newLead.full_name} onChange={e => setNewLead({...newLead, full_name: e.target.value})} type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all font-semibold" placeholder="e.g. Elon Musk" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Company</label>
                  <input required value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Job Title</label>
                  <input required value={newLead.title} onChange={e => setNewLead({...newLead, title: e.target.value})} type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-semibold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">LinkedIn URL</label>
                  <input required value={newLead.linkedin_url} onChange={e => setNewLead({...newLead, linkedin_url: e.target.value})} type="url" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Website</label>
                  <input required value={newLead.website} onChange={e => setNewLead({...newLead, website: e.target.value})} type="url" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-semibold" />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-950 text-white font-black py-6 rounded-[32px] hover:bg-slate-900 transition-all text-lg shadow-2xl shadow-slate-200">
                Confirm & Add Target
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress-indefinite {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 2s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default App;
