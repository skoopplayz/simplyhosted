import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  doc,
  setDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Upload, 
  Github, 
  Plus, 
  ExternalLink, 
  Search, 
  Server, 
  Shield, 
  Clock, 
  Terminal, 
  Activity, 
  Settings, 
  Trash2,
  Globe,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  FileCode,
  Box,
  X,
  Key,
  RefreshCw,
  Lock,
  Link2
} from 'lucide-react';

/**
 * FIREBASE CONFIGURATION
 */
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'eternal-host-v1';

const BASE_HOSTING_URL = 'simplyhosted.vercel.app';

// --- SHARED UI COMPONENTS ---

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'primary', size = 'md', className = '', loading = false, ...props }) => {
  const variants = {
    primary: 'bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-400',
    secondary: 'bg-white text-black border border-zinc-200 hover:bg-zinc-50',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-black',
    danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button 
      className={`inline-flex items-center justify-center rounded-md font-medium transition-all active:scale-[0.98] disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading}
      {...props}
    >
      {loading ? <Activity className="w-4 h-4 animate-spin mr-2" /> : null}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-zinc-200 rounded-xl overflow-hidden transition-all duration-200 ${className}`}>
    {children}
  </div>
);

// --- MAIN APPLICATION ---

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('overview'); 
  const [deployments, setDeployments] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  // GitHub State
  const [ghToken, setGhToken] = useState('');
  const [ghRepos, setGhRepos] = useState([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // 1. Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Fetch Global Deployments
  useEffect(() => {
    if (!user) return;
    const deploymentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'deployments');
    const unsubscribe = onSnapshot(deploymentsRef, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sorted = docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setDeployments(sorted);
      },
      (error) => console.error("Firestore error:", error)
    );
    return () => unsubscribe();
  }, [user]);

  // 3. GitHub API Connection
  const connectToGithub = async () => {
    if (!ghToken) return;
    setIsFetchingRepos(true);
    try {
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
        headers: {
          'Authorization': `token ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGhRepos(data);
        setIsTokenValid(true);
        setStatusMessage({ type: 'success', text: 'GitHub connected successfully!' });
      } else {
        throw new Error('Invalid token');
      }
    } catch (err) {
      setIsTokenValid(false);
      setStatusMessage({ type: 'error', text: 'Failed to connect to GitHub. Check your token.' });
    } finally {
      setIsFetchingRepos(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const createDeployment = async (name, type, repoData = null) => {
    if (!user) return;
    setIsDeploying(true);
    try {
      const deploymentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'deployments');
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const newDeployment = {
        name: name,
        slug: slug,
        type: type,
        repoUrl: repoData?.html_url || null,
        repoName: repoData?.full_name || null,
        // Hosting on simplyhosted.vercel.app/[slug]
        url: `${BASE_HOSTING_URL}/${slug}`,
        status: 'Ready',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        region: 'Vercel (Global Edge)'
      };
      
      await addDoc(deploymentsRef, newDeployment);
      setStatusMessage({ type: 'success', text: `Successfully hosted at /${slug}` });
      setView('overview');
    } catch (err) {
      setStatusMessage({ type: 'error', text: "Deployment failed." });
    } finally {
      setIsDeploying(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) createDeployment(files[0].name.split('.')[0], 'Manual');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans selection:bg-zinc-200">
      {statusMessage && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          statusMessage.type === 'success' ? 'bg-black text-white' : 'bg-red-600 text-white'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
              <div className="w-7 h-7 bg-black rounded flex items-center justify-center">
                <Box className="text-white w-4 h-4" />
              </div>
              <span>SimplyHosted</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-zinc-500 font-medium">
              <button onClick={() => setView('overview')} className={`hover:text-black transition-colors ${view === 'overview' ? 'text-black font-semibold' : ''}`}>Dashboard</button>
              <button className="hover:text-black transition-colors">Usage</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase leading-none">Status</p>
                  <p className="text-[11px] font-mono text-zinc-600">{user.isAnonymous ? 'Guest User' : 'Public'}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              </div>
            ) : <Activity className="w-5 h-5 animate-spin text-zinc-300" />}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {view === 'overview' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Project Ledger</h1>
                <p className="text-zinc-500 mt-1">Hosting on <code className="bg-zinc-100 px-1 rounded">simplyhosted.vercel.app/*</code></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text" placeholder="Search paths..." 
                    className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-md text-sm focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-zinc-400 transition-all w-full sm:w-64"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={() => setView('import')} className="gap-2 shadow-sm">
                  <Plus className="w-4 h-4" /> New Project
                </Button>
              </div>
            </header>

            {deployments.length === 0 ? (
              <div className="py-24 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-center px-4 bg-white/50">
                <Globe className="w-12 h-12 text-zinc-200 mb-4" />
                <h3 className="text-lg font-semibold text-zinc-400">No active paths</h3>
                <p className="text-zinc-400 max-w-xs mx-auto mb-6 text-sm">Deploy a project to claim your subpath on Vercel.</p>
                <Button onClick={() => setView('import')}>Start Hosting</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deployments
                  .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.slug?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((deploy) => (
                    <Card key={deploy.id} className="group hover:shadow-xl hover:border-zinc-400">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-center">
                              {deploy.type === 'GitHub' ? <Github className="w-6 h-6" /> : <Upload className="w-6 h-6 text-zinc-400" />}
                            </div>
                            <div>
                              <h3 className="font-bold text-base truncate max-w-[140px]">{deploy.name}</h3>
                              <p className="text-[10px] text-zinc-400 font-mono">/{deploy.slug}</p>
                            </div>
                          </div>
                          <Badge variant="success">Online</Badge>
                        </div>
                        
                        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100 flex items-center justify-between mb-4 group/url cursor-pointer" onClick={() => window.open(`https://${deploy.url}`, '_blank')}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Link2 className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span className="truncate text-[11px] font-medium text-zinc-600">/{deploy.slug}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-zinc-300 group-hover/url:text-black transition-colors shrink-0" />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2">
                          <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" /> SSL Active</div>
                          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {deploy.createdAt?.seconds ? new Date(deploy.createdAt.seconds * 1000).toLocaleDateString() : '...'}</div>
                        </div>
                      </div>
                    </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setView('overview')} className="gap-2">
                <ArrowRight className="w-4 h-4 rotate-180" /> Dashboard
              </Button>
              <h1 className="text-xl font-bold">New Project</h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* GitHub Section */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Connect GitHub</h2>
                <Card className="p-0">
                  <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                    {!isTokenValid ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Key className="w-5 h-5 text-zinc-400" />
                          <span className="font-semibold text-sm">Personal Access Token</span>
                        </div>
                        <p className="text-xs text-zinc-500">List your repositories to import them to your subpath.</p>
                        <div className="flex gap-2">
                          <input 
                            type="password"
                            placeholder="ghp_xxxxxxxxxxxx"
                            className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black/5"
                            value={ghToken}
                            onChange={(e) => setGhToken(e.target.value)}
                          />
                          <Button size="sm" onClick={connectToGithub} loading={isFetchingRepos}>Fetch</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Github className="w-5 h-5" />
                          <span className="font-semibold text-sm">Authenticated</span>
                        </div>
                        <button onClick={() => {setIsTokenValid(false); setGhRepos([]);}} className="text-[10px] font-bold text-zinc-400 hover:text-black uppercase">Switch Account</button>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2 min-h-[240px]">
                    {isFetchingRepos ? (
                      <div className="h-full flex items-center justify-center py-20 text-zinc-400"><RefreshCw className="w-5 h-5 animate-spin" /></div>
                    ) : ghRepos.length > 0 ? (
                      ghRepos.map(repo => (
                        <button 
                          key={repo.id}
                          onClick={() => createDeployment(repo.name, 'GitHub', repo)}
                          className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 rounded-lg transition-colors group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <FileCode className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-sm font-medium">{repo.name}</p>
                              <p className="text-[10px] text-zinc-400">{repo.language || 'Project'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-300 group-hover:text-black transition-all">
                            <span className="text-[10px] opacity-0 group-hover:opacity-100">Claim /{repo.name.toLowerCase()}</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-20 text-zinc-300 text-center px-6">
                        <Github className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs">Enter your token above to see your repos.</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Upload Section */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Direct Assets</h2>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`h-full min-h-[380px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center transition-all ${
                    isDragging ? 'border-black bg-zinc-100 scale-[1.01]' : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${isDragging ? 'bg-black text-white' : 'bg-white border border-zinc-100 text-zinc-400'}`}>
                    <Upload className={`w-8 h-8 ${isDragging ? 'animate-bounce' : ''}`} />
                  </div>
                  <h3 className="font-bold">Manual Deployment</h3>
                  <p className="text-xs text-zinc-400 mt-2 mb-6">Drop folders or files to host them instantly at <br/><code>{BASE_HOSTING_URL}/[name]</code></p>
                  <Button variant="secondary" size="sm" onClick={() => document.getElementById('fileInput').click()}>Browse Local Files</Button>
                  <input type="file" id="fileInput" className="hidden" onChange={(e) => e.target.files[0] && createDeployment(e.target.files[0].name.split('.')[0], 'Manual')} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Deployment Modal Overlay */}
      {isDeploying && (
        <div className="fixed inset-0 z-[110] bg-white/95 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in">
          <div className="max-w-sm w-full space-y-6 text-center">
            <div className="w-20 h-20 bg-black rounded-[2rem] mx-auto flex items-center justify-center animate-[pulse_2s_infinite] shadow-2xl">
              <Server className="text-white w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Provisioning Path</h2>
              <p className="text-zinc-500 text-sm mt-2">Connecting to simplyhosted.vercel.app edge network...</p>
            </div>
            <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden">
              <div className="h-full bg-black animate-[loading_1.5s_ease-in-out_infinite]" style={{width: '40%'}}></div>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-7xl mx-auto px-6 py-10 border-t border-zinc-100 mt-20 flex flex-col sm:flex-row justify-between items-center gap-4 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 grayscale" />
          SimplyHosted
        </div>
        <div>Immutable Cloud Network &copy; 2024</div>
      </footer>
    </div>
  );
}

// Global CSS for custom animations
const style = document.createElement('style');
style.textContent = `
  @keyframes loading {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(250%); }
  }
`;
document.head.appendChild(style);
