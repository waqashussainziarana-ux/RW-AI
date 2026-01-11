import React, { useState, useEffect, useRef } from 'react';
import { Lead, LeadStatus, AuditResult, AutomationStatus, DiscoveryResult } from './types.ts';
import { analyzeWebsite, generateSalesMessage, discoverLeads } from './services/geminiService.ts';
import LeadCard from './components/LeadCard.tsx';
import { 
  Plus, LayoutDashboard, Users, MessageSquare, 
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
    try {
      const saved = localStorage.getItem('agency_leads_v3');
      if (saved) {
        setLeads(JSON.parse(saved));
      }
    } catch (e) { console.error(e); }
  }, []);

  const saveLeads = (updated: Lead[]) => {
    setLeads(updated);
    localStorage.setItem('agency_leads_v3', JSON.stringify(updated));
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    const lead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      full_name: newLead.full_name || '',
      linkedin_url: newLead.linkedin_url || '',
      title: newLead.title || '',
      company: newLead.company || '',
      website: newLead.website || '',
      country: newLead.country || 'United States',
      industry: newLead.industry || '',
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
      alert("Discovery failed. Check API key and search availability.");
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
      saveLeads(leads.map(l => l.id === id ? { 
        ...l, 
        status: LeadStatus.ANALYZED, 
        pain_points: audit.pain_points.join(', '), 
        ai_message: message 
      } : l));
    } catch (err) {
      alert("Analysis error.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleApprove = (id: string) => {
    saveLeads(leads.map(l => l.id === id ? { ...l, approved: true, automation_status: 'queued' as AutomationStatus } : l));
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
    const nextLead = leads.find(l => l.approved && l.automation_status === 'queued');
    if (!nextLead) {
      setIsCampaignActive(false);
      return;
    }
    setLeads(prev => prev.map(l => l.id === nextLead.id ? { ...l, automation_status: 'sending' as AutomationStatus } : l));
    const delay = 3000 + Math.random() * 5000;
    campaignTimerRef.current = window.setTimeout(() => {
      setLeads(prev => {
        const updated = prev.map(l => l.id === nextLead.id ? { ...l, automation_status: 'sent' as AutomationStatus, status: LeadStatus.MESSAGED } : l);
        localStorage.setItem('agency_leads_v3', JSON.stringify(updated));
        if (isCampaignActive) setTimeout(processNextInQueue, 2000);
        return updated;
      });
    }, delay);
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
                 { label: 'Total Leads', val: leads.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                 { label: 'Outreach', val: leads.filter(l => l.automation_status === 'sent').length, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                 { label: 'Analyzed', val: leads.filter(l => l.status !== LeadStatus.NEW).length, icon: Search, color: 'text-amber-600', bg: 'bg-amber-50' },
                 { label: 'Hot Leads', val: leads.filter(l => l.status === LeadStatus.HOT).length, icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
               ].map((stat, i) => (
                 <div key={i} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between">
                   <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                      <stat.icon size={24} />
                   </div>
                   <div>
                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                     <p className="text-3xl font-black text-slate-900 mt-1">{stat.val}</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        );
      case 'targets':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center mb-12">
              <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Prospecting</h1>
                <p className="text-slate-500 text-lg font-medium mt-2">Targeting frustrations in US, UK, and EU markets.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-slate-950 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-3 shadow-2xl transition-all hover:scale-105"
              >
                <Plus size={24} /> Manual Lead
              </button>
            </header>

            <div className="bg-white rounded-[40px] p-10 mb-12 border border-slate-200 shadow-xl overflow-hidden relative">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Target size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Frustration Scouter</h3>
                    <p className="text-slate-500 font-medium italic">Finding founders with slow sites or poor SEO...</p>
                  </div>
               </div>
               
               <form onSubmit={handleDiscoverySearch} className="flex gap-4 mb-10">
                  <div className="flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      type="text" 
                      placeholder="e.g. 'Founders frustrated with website speed' or 'SEO help needed'" 
                      className="w-full pl-14 pr-6 py-6 bg-slate-50 border border-slate-200 rounded-[28px] outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-lg"
                    />
                  </div>
                  <button 
                    disabled={isSearching}
                    type="submit" 
                    className="bg-slate-900 text-white px-12 rounded-[28px] font-black shadow-xl flex items-center gap-3 transition-all disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={20} />}
                    {isSearching ? 'Scouting...' : 'Scan Socials'}
                  </button>
               </form>

               {discoveryResults.length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {discoveryResults.map((res, i) => (
                      <div key={i} className="bg-slate-50 p-6 rounded-[32px] border border-slate-200 flex flex-col justify-between group hover:bg-white hover:border-blue-200 transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                              <Megaphone size={10} /> {res.source_platform}
                            </span>
                          </div>
                          <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">{res.full_name}</h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-tight mb-4">{res.title} @ {res.company}</p>
                          <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-600/10 mb-6">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Frustration Signal</p>
                            <p className="text-sm text-slate-700 font-medium italic leading-relaxed">"{res.intent_signal}"</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleImportLead(res)}
                          className="w-full py-4 rounded-2xl bg-white border border-slate-200 font-black text-slate-900 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
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
              <p className="text-slate-500 text-lg font-medium mt-2">Batch processing approved outreach drafts.</p>
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
                  <button onClick={startCampaign} className={`w-full py-6 rounded-[32px] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl ${isCampaignActive ? 'bg-rose-100 text-rose-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {isCampaignActive ? <Pause size={32} /> : <Play size={32} />}
                    {isCampaignActive ? 'Kill Active Process' : 'Deploy Outreach Batch'}
                  </button>
               </div>
            </div>
          </div>
        );
      case 'inbox':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-12">
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Inbox AI</h1>
            </header>
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-20 flex flex-col items-center justify-center text-center">
               <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare size={48} className="text-rose-500" />
               </div>
               <h3 className="text-2xl font-black text-slate-900">Queue is Clear</h3>
               <p className="text-slate-500 font-medium mt-2 max-w-sm">When leads reply to your LinkedIn message, the AI will pull them here.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-blue-100">
      <aside className="w-full md:w-72 bg-slate-950 text-slate-300 p-8 flex flex-col border-r border-slate-900 shrink-0">
        <div className="flex items-center gap-4 text-white mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl">RW</div>
          <span className="font-black text-xl tracking-tight">RW Agency</span>
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
                ? 'bg-white/10 text-white border-white/10' 
                : 'hover:bg-white/5 text-slate-500 border-transparent'
              }`}
            >
              <item.icon size={20} className={activeView === item.id ? 'text-blue-500' : ''} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-8 md:p-12">
        {renderView()}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-900">Manual Injection</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-xl">✕</button>
            </div>
            <form onSubmit={handleAddLead} className="p-10 space-y-8">
              <input required value={newLead.full_name} onChange={e => setNewLead({...newLead, full_name: e.target.value})} type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none" placeholder="Full Name" />
              <input required value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none" placeholder="Company" />
              <input required value={newLead.linkedin_url} onChange={e => setNewLead({...newLead, linkedin_url: e.target.value})} type="url" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none" placeholder="LinkedIn URL" />
              <input required value={newLead.website} onChange={e => setNewLead({...newLead, website: e.target.value})} type="url" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none" placeholder="Website" />
              <button type="submit" className="w-full bg-slate-950 text-white font-black py-6 rounded-[32px]">Add Target</button>
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
      `}</style>
    </div>
  );
};

export default App;