import { useState, useEffect, useMemo } from 'react';
import { Search, Phone, Mail, User, RefreshCw, Filter } from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Officer {
  name: string;
  designation: string;
  mobile: string;
  email: string;
  constituency?: string;
  type?: 'FST' | 'RO_ARO';
}

const FST_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1vvE_PB_zGDBslHw29xvLVQWGQBUmuDZG/export?format=csv';
const RO_ARO_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1BBVN-aKbNeh9wMAekRR67WXoQNc_t-ZZ/export?format=csv';

const getWhatsAppUrl = (mobile: string) => {
  const cleaned = mobile.replace(/\D/g, '');
  // Default to 91 prefix if it's a 10-digit number
  const phone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
  return `https://wa.me/${phone}`;
};

export default function App() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [fstResponse, roAroResponse] = await Promise.all([
        fetch(FST_SHEET_URL),
        fetch(RO_ARO_SHEET_URL)
      ]);
      
      const fstCsvText = await fstResponse.text();
      const roAroCsvText = await roAroResponse.text();
      
      const fstDataPromise = new Promise<Officer[]>((resolve) => {
        Papa.parse(fstCsvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = results.data.map((row: any) => ({
              name: row['Designation'] || 'Unknown Officer',
              designation: row['Designation'] || 'N/A',
              mobile: row['Mobile No'] || '',
              email: row['e.mail'] || '',
              type: 'FST' as const,
            }));
            resolve(parsed);
          }
        });
      });

      const roAroDataPromise = new Promise<Officer[]>((resolve) => {
        Papa.parse(roAroCsvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = results.data.map((row: any) => ({
              name: row['Name'] || 'Unknown',
              designation: row['RO/ARO'] || 'N/A',
              mobile: row['Mobile No'] || '',
              email: '', // No email in this sheet
              constituency: row['Assembly Constituency'] || '',
              type: 'RO_ARO' as const,
            }));
            resolve(parsed);
          }
        });
      });

      const [fstOfficers, roAroOfficers] = await Promise.all([fstDataPromise, roAroDataPromise]);
      setOfficers([...fstOfficers, ...roAroOfficers]);
      setLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      setError('Failed to fetch data');
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const designations = useMemo(() => {
    const unique = new Set(officers.map(o => o.constituency || o.designation));
    return ['all', ...Array.from(unique)];
  }, [officers]);

  const filteredOfficers = useMemo(() => {
    return officers.filter(officer => {
      const searchStr = `${officer.name} ${officer.designation} ${officer.constituency || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      
      const matchesFilter = designationFilter === 'all' || 
                           officer.designation === designationFilter || 
                           officer.constituency === designationFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [officers, searchQuery, designationFilter]);

  const groupedOfficers = useMemo<Record<string, Officer[]>>(() => {
    const groups: Record<string, Officer[]> = {};
    
    filteredOfficers.forEach(officer => {
      const key = officer.constituency || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(officer);
    });
    
    return groups;
  }, [filteredOfficers]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20 relative">
      {/* Polished Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5" />
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-pink-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header Section */}
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900">
                Officer <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">Directory</span>
              </h1>
              <div className="flex items-center gap-2 text-slate-500">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                <p className="text-sm font-medium">
                  {loading ? 'Syncing records...' : `${officers.length} Active Personnel`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="rounded-full bg-white/50 border-slate-200 hover:border-purple-200 hover:text-purple-600 transition-all shadow-sm"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
              <Input
                placeholder="Search by name, designation, or constituency..."
                className="pl-11 h-12 bg-white/50 border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-72">
              <Select value={designationFilter} onValueChange={setDesignationFilter}>
                <SelectTrigger className="h-12 bg-white/50 border-slate-200 rounded-2xl focus:bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="Filter by Constituency" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                  {designations.map((d) => (
                    <SelectItem key={d} value={d} className="rounded-lg">
                      {d === 'all' ? 'All Constituencies' : d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative">
        {loading && officers.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200/50 animate-pulse rounded-[2rem] border border-slate-200/60" />
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            <AnimatePresence mode="popLayout">
              {(Object.entries(groupedOfficers) as [string, Officer[]][]).map(([constituency, groupOfficers]) => (
                <div key={constituency} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-1.5 brand-gradient rounded-full" />
                    <h2 className="text-2xl font-display font-bold text-slate-900">{constituency}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {groupOfficers.map((officer, index) => (
                      <motion.div
                        key={`${officer.name}-${index}`}
                        layout
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: Math.min(index * 0.05, 0.5),
                          ease: [0.23, 1, 0.32, 1]
                        }}
                      >
                        <Card className={cn(
                          "glass-card h-full border-none rounded-[2rem] overflow-hidden group hover:-translate-y-2 transition-all duration-500",
                          officer.type === 'RO_ARO' ? "ring-2 ring-purple-500/20" : ""
                        )}>
                          <div className="h-2 w-full brand-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          
                          <CardHeader className="pb-4 pt-8 px-8">
                            <div className="flex flex-col items-center text-center gap-4">
                              <div className="relative">
                                <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <Avatar className="h-20 w-20 border-4 border-white shadow-xl relative z-10">
                                  <AvatarFallback className={cn(
                                    "text-white",
                                    officer.type === 'RO_ARO' ? "bg-purple-600" : "bg-brand-500"
                                  )}>
                                    <User className="h-10 w-10" />
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              
                              <div className="space-y-1">
                                <CardTitle className="text-2xl font-display font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                                  {officer.name}
                                </CardTitle>
                                <div className={cn(
                                  "inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                  officer.type === 'RO_ARO' ? "bg-purple-50 text-purple-700" : "bg-brand-50 text-brand-700"
                                )}>
                                  {officer.designation}
                                </div>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-4 pb-8 px-8 space-y-6">
                            <div className="space-y-4">
                              <a 
                                href={`tel:${officer.mobile}`}
                                className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50/50 hover:bg-brand-50 hover:text-brand-700 transition-all group/link"
                              >
                                <div className="p-2 bg-white rounded-xl shadow-sm group-hover/link:shadow-brand-100 transition-all">
                                  <Phone className="h-4 w-4 text-slate-400 group-hover/link:text-brand-500" />
                                </div>
                                <span className="text-sm font-semibold tracking-tight">{officer.mobile}</span>
                              </a>
                              
                              {officer.email && (
                                <a 
                                  href={`mailto:${officer.email}`}
                                  className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50/50 hover:bg-brand-50 hover:text-brand-700 transition-all group/link"
                                >
                                  <div className="p-2 bg-white rounded-xl shadow-sm group-hover/link:shadow-brand-100 transition-all">
                                    <Mail className="h-4 w-4 text-slate-400 group-hover/link:text-brand-500" />
                                  </div>
                                  <span className="text-sm font-semibold tracking-tight truncate">{officer.email}</span>
                                </a>
                              )}
                            </div>
                            
                            <div className="flex gap-3">
                              <a 
                                href={`tel:${officer.mobile}`}
                                className={cn(
                                  buttonVariants({ variant: "default" }),
                                  "flex-1 h-12 rounded-2xl text-white shadow-lg transition-all duration-300 active:scale-[0.98] font-bold flex items-center justify-center bg-slate-900 hover:brand-gradient hover:shadow-purple-200"
                                )}
                              >
                                <Phone className="mr-2 h-4 w-4" />
                                Call
                              </a>
                              <a 
                                href={getWhatsAppUrl(officer.mobile)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  buttonVariants({ variant: "outline" }),
                                  "w-14 h-12 rounded-2xl border-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all duration-300 active:scale-[0.98] flex items-center justify-center shadow-sm shrink-0"
                                )}
                              >
                                <img 
                                  src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
                                  alt="WhatsApp" 
                                  className="h-6 w-6" 
                                  referrerPolicy="no-referrer"
                                />
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredOfficers.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-32"
          >
            <div className="bg-white/50 backdrop-blur-md h-24 w-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-200/60">
              <Search className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-display font-bold text-slate-900">No matching records</h3>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">We couldn't find any officers matching your current search criteria.</p>
            <Button 
              variant="link" 
              onClick={() => { setSearchQuery(''); setDesignationFilter('all'); }}
              className="mt-6 text-purple-600 font-bold hover:text-purple-700"
            >
              Reset all filters
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
