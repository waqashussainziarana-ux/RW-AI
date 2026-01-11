import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lead, LeadStatus, AuditResult, AutomationStatus, DiscoveryResult } from './types.ts';
import { analyzeWebsite, generateSalesMessage, discoverLeads } from './services/geminiService.ts';
import LeadCard from './components/LeadCard.tsx';
import { 
  Plus, LayoutDashboard, Users, MessageSquare, 
  Search, Play, Pause, Zap, CheckCircle2, TrendingUp, Clock,
  Sparkles, Loader2, UserPlus, Target, Megaphone, Filter, XCircle, Globe, Briefcase
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

  // Filter States
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');

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
    } catch (e) {
      console.error("Failed to load leads from storage", e);
    }
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
      console.error(err);
      alert("Search failed. Ensure your Gemini API Key is configured.");
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
      alert("AI Audit failed. Check API connectivity.");
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
           localStorage.setItem('agency_leads_v3', JSON.stringify(updated));
           if (isCampaignActive) setTimeout(processNextInQueue, 2000);
           return updated;
        });
      }, delay);
      return processingLeads;
    });
  };

  // Computed Values for Filters
  const uniqueCountries = useMemo(() => Array.from(new Set(leads.map(l => l.country).filter(Boolean))).sort(), [leads]);
  const uniqueIndustries = useMemo(() => Array.from(new Set(leads.map(l => l.industry).filter(Boolean))).sort(), [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = listSearchTerm === '' || 
        l.full_name.toLowerCase().includes(listSearchTerm.toLowerCase()) || 
        l.company.toLowerCase().includes(listSearchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesCountry = countryFilter === 'all' || l.country === countryFilter;
      const matchesIndustry = industryFilter === 'all' || l.industry === industryFilter;
      return matchesSearch && matchesStatus && matchesCountry && matchesIndustry;
    });
  }, [leads, listSearchTerm, statusFilter, countryFilter, industryFilter]);

  const clearFilters = () => {
    setListSearchTerm('');
    setStatusFilter('all');
    setCountryFilter('all');
    setIndustryFilter('all');
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10">
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter">RW Dashboard</h1>
              <p className="text-slate-500 text-lg font-medium mt-2">Local Pipeline (Private Storage)</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
               {[
                 { label: 'Total Leads', val: leads.length, bg: 'bg-blue-50', color: 'text-blue-600', icon: Users },
                 { label: 'Outreach', val: leads.filter(l => l.automation_status === 'sent').length, bg: 'bg-emerald-50', color: 'text-emerald-600', icon: Zap },
                 { label: 'Analyzed', val: leads.filter(l => l.status !== LeadStatus.NEW).length, bg: 'bg-amber-50', color: 'text-amber-600', icon: Search },
                 { label: 'Hot Leads', val: leads.filter(l => l.status === LeadStatus.HOT).length, bg: 'bg-rose-50', color: 'text-rose-600', icon: TrendingUp },
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

            <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden text-white mb-12">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10">
                <h3 className="text-3xl font-black mb-4 leading-tight">Secure Local Workflow</h3>
                <p className="text-slate-400 mb-8 max-w-xl font-medium">All data is stored in your browser. No external database is used, ensuring prospect privacy and instant performance.</p>
                <div className="flex gap-4">
                  <div className="px-5 py-3 bg-white/10 rounded-2xl border border-white/10 text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" /> Private
                  </div>
                  <div className="px-5 py-3 bg-white/10 rounded-2xl border border-white/10 text-sm font-bold flex items-center gap-2">
                    <Clock size={16} className="text-blue-400" /> Offline Ready
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
                <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" /> Add Lead
              </button>
            </header>

            <div className="bg-white rounded-[40px] p-10 mb-12 border border-slate-200 shadow-xl overflow-hidden relative">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Target size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Intent Scouter Agent</h3>
                    <p className="text-slate-500 font-medium italic">Scanning social feeds for active requests (US/UK/EU)...</p>
                  </div>
               </div>
               
               <form onSubmit={handleDiscoverySearch} className="flex gap-4 mb-10">
                  <div className="flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      type="text" 
                      placeholder="e.g. 'Looking for web developer' on LinkedIn" 
                      className="w-full pl-14 pr-6 py-6 bg-slate-50 border border-slate-200 rounded-[28px] outline-none focus:ring-4 focus:ring-blue-100 font-bold text-lg"
                    />
                  </div>
                  <button 
                    disabled={isSearching}
                    type="submit" 
                    className="bg-slate-900 text-white px-12 rounded-[28px] font-black shadow-xl flex items-center gap-3 disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={20} />}
                    {isSearching ? 'Scouting...' : 'Scan Interest'}
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
                          </div>
                          <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">{res.full_name}</h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-tight mb-4">{res.title} @ {res.company}</p>
                          <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-600/10 mb-6">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Intent Detected</p>
                            <p className="text-sm text-slate-700 font-medium italic">"{res.intent_signal}"</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleImportLead(res)}
                          className="w-full py-4 rounded-2xl bg-white border border-slate-200 font-black text-slate-900 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                          <UserPlus size={18} /> Import Lead
                        </button>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            {/* Leads Filter Bar */}
            <div className="bg-white rounded-[32px] p-6 mb-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 transition-all sticky top-4 z-40 backdrop-blur-md bg-white/90">
                <div className="flex-1 w-full relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search leads by name or company..." 
                    value={listSearchTerm}
                    onChange={(e) => setListSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white font-bold text-sm"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative group">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
                      className="pl-9 pr-8 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 appearance-none font-black text-[10px] uppercase tracking-widest text-slate-600 cursor-pointer"
                    >
                      <option value="all">ALL STATUSES</option>
                      {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="relative group">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select 
                      value={countryFilter}
                      onChange={(e) => setCountryFilter(e.target.value)}
                      className="pl-9 pr-8 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 appearance-none font-black text-[10px] uppercase tracking-widest text-slate-600 cursor-pointer"
                    >
                      <option value="all">ALL COUNTRIES</option>
                      {uniqueCountries.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="relative group">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select 
                      value={industryFilter}
                      onChange={(e) => setIndustryFilter(e.target.value)}
                      className="pl-9 pr-8 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 appearance-none font-black text-[10px] uppercase tracking-widest text-slate-600 cursor-pointer"
                    >
                      <option value="all">ALL INDUSTRIES</option>
                      {uniqueIndustries.map(i => <option key={i} value={i}>{i.toUpperCase()}</option>)}
                    </select>
                  </div>

                  {(listSearchTerm || statusFilter !== 'all' || countryFilter !== 'all' || industryFilter !== 'all') && (
                    <button 
                      onClick={clearFilters}
                      className="p-3 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Clear all filters"
                    >
                      <XCircle size={20} />
                    </button>
                  )}
                </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="bg-white rounded-[40px] p-20 border border-slate-100 flex flex-col items-center justify-center text-center">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Search size={32} className="text-slate-300" />
                 </div>
                 <h3 className="text-xl font-black text-slate-900">No matching leads</h3>
                 <p className="text-slate-500 font-medium mt-2 max-w-sm">Try adjusting your filters or add new prospects.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} onAnalyze={handleAnalyze} onApprove={handleApprove} loading={loadingId === lead.id} />
                ))}
              </div>
            )}
          </div>
        );
      case 'automation':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <header className="mb-12">
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Campaign Engine</h1>
              <p className="text-slate-500 text-lg font-medium mt-2">Managing the local outreach cycle.</p>
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
                    {isCampaignActive ? 'Stop Process' : 'Deploy Outreach Batch'}
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
              <p className="text-slate-500 text-lg font-medium mt-2">Manage lead responses locally.</p>
            </header>
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-20 flex flex-col items-center justify-center text-center">
               <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare size={48} className="text-rose-500" />
               </div>
               <h3 className="text-2xl font-black text-slate-900">Queue is Clear</h3>
               <p className="text-slate-500 font-medium mt-2 max-w-sm">Lead replies will appear here as they come in from LinkedIn.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-blue-100">
      <aside className="w-full md:w-72 bg-slate-950 text-slate-300 p-8 flex flex-col border-r border-slate-900 shrink-0">
        <div className="flex items-center gap-4 text-white mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/20">RW</div>
          <div className="flex flex-col">
            <span className="font-black text-xl leading-none tracking-tight">RW Agency</span>
            <span className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1.5">LOCAL AGENT</span>
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
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-8 md:p-12">
        {renderView()}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Add Prospect</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-xl">✕</button>
            </div>
            <form onSubmit={handleAddLead} className="p-10 space-y-8">
              <input required value={newLead.full_name} onChange={e => setNewLead({...newLead, full_name: e.target.value})} type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none" placeholder="Full Name" />
              <input required value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none" placeholder="Company" />
              <input required value={newLead.linkedin_url} onChange={e => setNewLead({...newLead, linkedin_url: e.target.value})} type="url" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none" placeholder="LinkedIn URL" />
              <input required value={newLead.website} onChange={e => setNewLead({...newLead, website: e.target.value})} type="url" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none" placeholder="Website" />
              <button type="submit" className="w-full bg-slate-950 text-white font-black py-6 rounded-[32px] hover:bg-slate-900 transition-all text-lg shadow-xl shadow-slate-200">
                Confirm Lead
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
      `}</style>
    </div>
  );
};

export default App;