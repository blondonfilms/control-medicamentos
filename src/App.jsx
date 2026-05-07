import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot,
  collection,
  addDoc,
  query,
  getDocs
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Pill, 
  ShoppingCart, 
  AlertTriangle, 
  PlusCircle, 
  Save, 
  History, 
  Loader2, 
  Edit3, 
  X, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Wifi, 
  WifiOff, 
  Database, 
  Calendar, 
  Clock, 
  RotateCcw, 
  Search, 
  ExternalLink, 
  DollarSign, 
  AlertCircle, 
  ChevronRight, 
  Download,
  Truck
} from 'lucide-react';

/**
 * ⚠️ CONFIGURACIÓN DE FIREBASE ⚠️
 */
const firebaseConfig = {
  apiKey: "AIzaSyAiVjwE4HzqwT5OKLP-aiJCNEm5mGkxUGM",         
  authDomain: "control-medicamentos-9c9f9.firebaseapp.com",     
  projectId: "control-medicamentos-9c9f9",      
  storageBucket: "control-medicamentos-9c9f9.firebasestorage.app",  
  messagingSenderId: "805972069626", 
  appId: "1:805972069626:web:287622c95615b852070d43"           
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'control-medicamentos-9c9f9';

const getApiKey = () => {
  try {
    return import.meta.env.VITE_GEMINI_KEY || "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();
const isConfigReady = firebaseConfig && firebaseConfig.apiKey !== "";

let app, auth, db;
if (isConfigReady) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  }
}

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState('connecting');
  const [meds, setMeds] = useState([]);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('inventory');
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingStock, setAddingStock] = useState(null); 
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [deletingMed, setDeletingMed] = useState(null); 
  const [searchingMed, setSearchingMed] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [currentDate] = useState(new Date());
  const [editPurchaseDate, setEditPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
    
    const style = document.createElement('style');
    style.innerHTML = `
      body, html, #root { 
        background-color: #f1f5f9 !important; 
        color: #1e293b !important;
        margin: 0 !important;
        padding: 0 !important;
        min-height: 100vh !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important; 
        justify-content: flex-start !important;
        font-family: ui-sans-serif, system-ui, sans-serif !important;
      }
      .sticky-header {
        position: sticky;
        top: 0;
        z-index: 40;
        width: 100%;
        background-color: #f1f5f9;
        padding: 1.5rem 1rem 1rem 1rem;
      }
      .main-content {
        width: 100%;
        max-width: 1100px;
        padding: 0 1rem 4rem 1rem;
      }
      input { color: black !important; }
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!isConfigReady) return;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth error:", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', 'main');
    const unsubscribeMeds = onSnapshot(docRef, (docSnap) => {
      setDbStatus('online');
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMeds(data.meds || []);
      }
      setLoading(false);
    }, (error) => {
      setDbStatus(error.code === 'permission-denied' ? 'permission-error' : 'error');
      setLoading(false);
    });

    const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
    const unsubscribeEvents = onSnapshot(eventsRef, (querySnap) => {
      const evs = [];
      querySnap.forEach(doc => evs.push({ id: doc.id, ...doc.data() }));
      // Ordenar por fecha descendente en memoria (Regla 2)
      setEvents(evs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    });

    return () => {
      unsubscribeMeds();
      unsubscribeEvents();
    };
  }, [user]);

  const calcularEstado = (med) => {
    const fSync = new Date(med.fechaSync || new Date());
    const diff = currentDate - fSync;
    const dias = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    const dosisDia = (med.dosisMes || 0) / 30;
    const stockActual = Math.max(0, (med.stockCorte || 0) - (dias * dosisDia));
    const diasRestantes = dosisDia > 0 ? stockActual / dosisDia : 999;
    
    return {
      stockActual: parseFloat(stockActual.toFixed(1)),
      diasRestantes: Math.floor(diasRestantes),
      compraNecesaria: Math.ceil(Math.max(0, (dosisDia * 30) - stockActual)),
      estado: diasRestantes <= 2 ? 'critico' : diasRestantes <= (med.leadTime || 7) ? 'bajo' : 'ok',
      fSyncLabel: fSync.toLocaleDateString(),
      dosisDiaria: dosisDia
    };
  };

  const registrarEvento = async (tipo, medNombre, cantidad, extra = {}) => {
    if (!user || !db) return;
    const event = {
      timestamp: new Date().toISOString(),
      tipo, // 'compra' | 'entrega' | 'sistema'
      medNombre,
      cantidad,
      ...extra
    };
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), event);
  };

  const guardarCambiosMeds = async (nuevosMeds) => {
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', 'main');
    await setDoc(docRef, { meds: nuevosMeds }, { merge: true });
  };

  const registrarCapturaCompra = async (index, cantidad) => {
    const nuevosMeds = meds.map((m, i) => {
      if (i === index) {
        return { ...m, compradoPendiente: (m.compradoPendiente || 0) + cantidad };
      }
      return m;
    });
    await guardarCambiosMeds(nuevosMeds);
    await registrarEvento('compra', meds[index].nombre, cantidad);
  };

  const confirmarEntregaEnfermera = async (index) => {
    const med = meds[index];
    const stats = calcularEstado(med);
    const cantidadAEntregar = med.compradoPendiente || 0;
    
    const nuevosMeds = meds.map((m, i) => {
      if (i === index) {
        return { 
          ...m, 
          stockCorte: stats.stockActual + cantidadAEntregar, 
          fechaSync: new Date().toISOString(),
          compradoPendiente: 0 
        };
      }
      return m;
    });

    await guardarCambiosMeds(nuevosMeds);
    await registrarEvento('entrega', med.nombre, cantidadAEntregar);
    alert(`Se han cargado ${cantidadAEntregar} unidades al inventario de ${med.nombre}.`);
  };

  const exportarBaseDatos = () => {
    const headers = ["Medicamento", "Ultima Compra/Sinc", "Dosis Mes", "Frecuencia Diaria", "Lead Time (Min)", "Inventario Actual"];
    const rows = meds.map(m => {
      const stats = calcularEstado(m);
      return [
        m.nombre,
        m.fechaSync,
        m.dosisMes,
        (m.dosisMes / 30).toFixed(2),
        m.leadTime,
        stats.stockActual
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventario_medicamentos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const buscarMejorPrecio = async (medNombre) => {
    if (!apiKey) return alert("Configura la API Key de Gemini.");
    setSearchingMed(medNombre);
    setIsSearching(true);
    setSearchResult(null);

    const userQuery = `Busca el mejor precio para "${medNombre}" en Farmacias Guadalajara, del Ahorro y Benavides en Zapopan.`;
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userQuery }] }],
          tools: [{ "google_search": {} }]
        })
      });
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      setSearchResult({ text });
    } catch (e) {
      setSearchResult({ text: "Error en la búsqueda.", isError: true });
    }
    setIsSearching(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={48}/></div>;

  const medsFiltrados = meds.filter(m => m.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full flex flex-col items-center">
      <div className="sticky-header w-full flex justify-center">
        <div className="bg-indigo-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 w-full max-w-5xl">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black m-0 flex items-center justify-center md:justify-start gap-3">
              <Pill className="text-indigo-400" size={28} /> Control Tere Valencia
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
              <button onClick={() => setShowHistory(!showHistory)} className="bg-indigo-800 text-[10px] px-3 py-1.5 rounded-full border-none text-white cursor-pointer hover:bg-indigo-700 uppercase font-black tracking-widest flex items-center gap-1 transition-all">
                <History size={12}/> Eventos
              </button>
              <button onClick={exportarBaseDatos} className="bg-emerald-600 text-[10px] px-3 py-1.5 rounded-full border-none text-white cursor-pointer hover:bg-emerald-500 uppercase font-black tracking-widest flex items-center gap-1 transition-all shadow-lg">
                <Download size={12}/> Descargar DB
              </button>
              {dbStatus === 'online' ? <Wifi size={14} className="text-emerald-400"/> : <WifiOff size={14} className="text-red-400"/>}
            </div>
          </div>
          <div className="flex gap-2 bg-indigo-950/40 p-2 rounded-2xl shadow-inner">
            <button onClick={() => setView('inventory')} className={`px-5 py-2.5 rounded-xl font-black text-sm border-none cursor-pointer transition-all ${view === 'inventory' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-transparent text-indigo-200'}`}>Inventario</button>
            <button onClick={() => setView('shopping')} className={`px-5 py-2.5 rounded-xl font-black text-sm border-none cursor-pointer transition-all ${view === 'shopping' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-transparent text-indigo-200'}`}>Compras</button>
            <button onClick={() => setIsAddingNew(true)} className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-black shadow-xl ml-2 active:scale-95 border-none cursor-pointer"><Plus size={22}/></button>
          </div>
        </div>
      </div>

      <div className="main-content w-full">
        {showHistory && (
          <div className="bg-slate-800 text-slate-300 p-6 rounded-[2rem] mb-6 shadow-inner animate-in slide-in-from-top-4 duration-300">
            <p className="text-white text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={14}/> Historial de Operaciones:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {events.map(l => (
                <div key={l.id} className="flex justify-between items-center text-xs border-b border-slate-700 pb-2 border-solid">
                  <div className="flex gap-2 items-center">
                    {l.tipo === 'compra' ? <ShoppingCart size={12} className="text-blue-400"/> : <Truck size={12} className="text-emerald-400"/>}
                    <span className="font-bold">{l.medNombre}</span>
                    <span className="opacity-70">({l.cantidad}u)</span>
                  </div>
                  <span className="opacity-40 text-[10px]">{new Date(l.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'inventory' ? (
          <div className="space-y-4">
            <div className="relative w-full max-w-5xl mx-auto">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
              <input 
                type="text" 
                placeholder="Filtrar medicamentos..." 
                className="w-full bg-white border border-solid border-slate-200 p-4 pl-12 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-black"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-solid border-slate-200 w-full overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-black">
                    <tr>
                      <th className="px-8 py-6">Medicamento</th>
                      <th className="px-8 py-6 text-center">Stock Estimado</th>
                      <th className="px-8 py-6 text-center">Reserva</th>
                      <th className="px-8 py-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {medsFiltrados.map((med, index) => {
                      const s = calcularEstado(med);
                      return (
                        <tr key={index} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4 text-left">
                              <div className={`w-3.5 h-3.5 rounded-full shadow-sm shrink-0 ${s.estado === 'ok' ? 'bg-emerald-400' : s.estado === 'bajo' ? 'bg-amber-400' : 'bg-red-500'}`} />
                              <div>
                                <p className="font-black text-slate-800 m-0 text-lg leading-tight">{med.nombre}</p>
                                <p className="text-[10px] text-slate-400 m-0 mt-1 uppercase font-bold flex items-center gap-1">
                                  <Calendar size={10}/> Conteo: {s.fSyncLabel}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center font-mono font-black text-2xl text-slate-700">{s.stockActual}</td>
                          <td className="px-8 py-6 text-center">
                            <div className={`inline-flex flex-col items-center px-4 py-2 rounded-2xl border border-solid shadow-sm ${
                              s.estado === 'critico' ? 'bg-red-50 text-red-600 border-red-100' : 
                              s.estado === 'bajo' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                              <span className="text-xl font-black leading-none">{s.diasRestantes}</span>
                              <span className="text-[9px] font-black uppercase mt-1 tracking-widest">Días</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-center items-center gap-3">
                              {s.estado !== 'ok' && (
                                <button onClick={() => buscarMejorPrecio(med.nombre)} className="p-2.5 bg-indigo-600 text-white rounded-xl hover:scale-110 border-none cursor-pointer shadow-md transition-all"><Search size={22}/></button>
                              )}
                              <button onClick={() => setEditingMed(index)} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 border-none cursor-pointer"><Edit3 size={18}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-xl p-8 md:p-12 border border-solid border-slate-200 w-full mt-4">
             <div className="flex flex-col items-center gap-2 mb-10">
                <ShoppingCart className="text-indigo-600" size={48}/>
                <h2 className="m-0 text-indigo-950 text-4xl font-black tracking-tighter">Proceso de Compra</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-center">Registra tus adquisiciones y entrégalas al centro de descanso</p>
             </div>

             <div className="grid md:grid-cols-2 gap-6 w-full">
                {meds.filter(m => calcularEstado(m).compraNecesaria > 0 || (m.compradoPendiente || 0) > 0).map((med, i) => {
                  const s = calcularEstado(med);
                  const comprado = med.compradoPendiente || 0;
                  const faltanteNeto = s.compraNecesaria - comprado;
                  const statusColor = faltanteNeto <= 0 ? 'border-emerald-500 bg-emerald-50/30' : comprado > 0 ? 'border-blue-500 bg-blue-50/30' : 'border-indigo-100 bg-indigo-50/30';

                  return (
                    <div key={i} className={`flex flex-col p-8 rounded-[2.5rem] border-2 border-solid ${statusColor} transition-all shadow-sm hover:shadow-lg gap-6`}>
                      <div className="flex justify-between items-start">
                         <div className="max-w-[70%]">
                            <span className="font-black text-slate-800 text-2xl leading-none block mb-1">{med.nombre}</span>
                            <span className="text-[10px] text-slate-400 font-black uppercase">Requerido: {s.compraNecesaria} u</span>
                         </div>
                         <div className="text-right">
                            <span className={`text-4xl font-black leading-none ${faltanteNeto <= 0 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                              {faltanteNeto > 0 ? `-${faltanteNeto}` : `+${Math.abs(faltanteNeto)}`}
                            </span>
                            <span className="text-[10px] block font-black uppercase mt-1">Faltante</span>
                         </div>
                      </div>

                      <div className="flex items-end gap-3 bg-white/50 p-4 rounded-3xl border border-solid border-slate-200">
                        <div className="flex-1">
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 ml-1">Sumar Compra</label>
                          <input 
                            id={`input-compra-${i}`}
                            type="number" 
                            className="w-full p-3 bg-white rounded-xl font-black text-xl border border-solid border-slate-100 shadow-inner text-black"
                            placeholder="0"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const val = parseInt(document.getElementById(`input-compra-${i}`).value);
                            if (val > 0) {
                              registrarCapturaCompra(meds.indexOf(med), val);
                              document.getElementById(`input-compra-${i}`).value = "";
                            }
                          }}
                          className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg border-none cursor-pointer hover:scale-105 transition-all"
                        >
                          <Save size={20}/>
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-solid border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase">En maleta</span>
                          <span className="text-2xl font-black text-slate-800">{comprado} u</span>
                        </div>
                        <button 
                          disabled={comprado <= 0}
                          onClick={() => confirmarEntregaEnfermera(meds.indexOf(med))}
                          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm border-none cursor-pointer transition-all ${comprado > 0 ? 'bg-emerald-500 text-white shadow-xl hover:bg-emerald-600' : 'bg-slate-200 text-slate-400 grayscale'}`}
                        >
                          <Truck size={18}/> Entregar
                        </button>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {(isAddingNew || editingMed !== null) && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <form onSubmit={handleForm} className="bg-white p-10 rounded-[4rem] shadow-2xl max-w-sm w-full text-left border-none animate-in zoom-in-95">
            <h3 className="m-0 mb-8 text-3xl font-black text-slate-800 tracking-tighter text-black">{isAddingNew ? 'Nuevo' : 'Editar'}</h3>
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block tracking-widest px-1">Nombre</label>
                <input name="nombre" defaultValue={isAddingNew ? "" : meds[editingMed].nombre} className="w-full p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-black text-lg outline-none text-black" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block tracking-widest px-1">U/Mes</label>
                  <input name="dosisMes" type="number" step="0.5" defaultValue={isAddingNew ? 30 : meds[editingMed].dosisMes} className="w-full p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-black text-lg outline-none text-black" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block tracking-widest px-1">Aviso (d)</label>
                  <input name="leadTime" type="number" defaultValue={isAddingNew ? 7 : meds[editingMed].leadTime} className="p-4 w-full border border-solid border-slate-100 bg-slate-50 rounded-2xl font-black text-lg outline-none text-black" required />
                </div>
              </div>
              <div className="p-6 bg-amber-50 rounded-3xl border border-solid border-amber-100 text-center">
                <label className="text-[10px] font-black text-amber-600 m-0 mb-2 uppercase block tracking-widest">Inventario Físico Hoy</label>
                <input name="stockManual" type="number" step="0.1" className="w-full p-4 border border-solid border-amber-200 bg-white rounded-xl font-black text-amber-700 text-center text-4xl outline-none text-black" placeholder={isAddingNew ? "0" : `${calcularEstado(meds[editingMed]).stockActual}`} />
              </div>
              <div className="bg-indigo-50 p-4 rounded-2xl border border-solid border-indigo-100 text-center">
                <label className="text-[10px] font-black text-indigo-600 mb-2 block uppercase tracking-widest">Fecha Sinc</label>
                <input name="fechaReferencia" type="date" defaultValue={isAddingNew ? new Date().toISOString().split('T')[0] : meds[editingMed].fechaSync.split('T')[0]} className="w-full p-3 border-none bg-white rounded-xl font-black text-indigo-800 text-center text-black" />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl border-none cursor-pointer">Guardar</button>
                <button type="button" onClick={() => {setIsAddingNew(false); setEditingMed(null);}} className="px-6 bg-slate-100 text-slate-400 rounded-2xl font-bold border-none cursor-pointer">Cerrar</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {searchingMed && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md flex items-center justify-center p-6 z-[60]">
          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl max-w-2xl w-full text-left border-none animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <DollarSign className="text-emerald-500" size={32}/>
                <h3 className="m-0 text-2xl font-black text-slate-800 tracking-tighter">Comparador de Precios</h3>
              </div>
              <button onClick={() => setSearchingMed(null)} className="p-2 text-slate-300 bg-transparent border-none cursor-pointer"><X size={28}/></button>
            </div>
            {isSearching ? (
              <div className="py-20 flex flex-col items-center justify-center gap-6">
                <Loader2 className="animate-spin text-indigo-600" size={60}/>
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Buscando en Zapopan...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className={`p-6 rounded-3xl border border-solid text-sm whitespace-pre-wrap leading-relaxed bg-slate-50 border-slate-100 text-slate-700`}>
                   {searchResult?.text}
                </div>
                <button onClick={() => setSearchingMed(null)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl border-none cursor-pointer">Entendido</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
