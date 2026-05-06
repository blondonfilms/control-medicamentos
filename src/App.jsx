import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot
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
  ChevronRight,
  RotateCcw
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

const appId = "control-medicamentos-9c9f9"; 
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
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState('inventory');
  const [showHistory, setShowHistory] = useState(false);
  const [addingStock, setAddingStock] = useState(null); 
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [deletingMed, setDeletingMed] = useState(null); 
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
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      .sticky-header {
        position: sticky;
        top: 0;
        z-index: 40;
        width: 100%;
        background-color: #f1f5f9;
        padding: 1.5rem 1rem 1rem 1rem;
        display: flex;
        justify-content: center;
      }
      .main-content {
        width: 100%;
        max-width: 1100px;
        padding: 0 1rem 4rem 1rem;
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!isConfigReady) return;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch (e) { console.error(e); }
      } else { setUser(u); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', 'main');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setDbStatus('online');
      if (docSnap.exists()) {
        const data = docSnap.data();
        let rawMeds = data.meds || [];
        const migrated = rawMeds.map(m => ({
          ...m,
          fechaSync: m.fechaSync || data.fechaCorte || new Date().toISOString()
        }));
        setMeds(migrated);
        setLogs(data.logs || []);
      }
      setLoading(false);
    }, (error) => {
      setDbStatus('error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const calcularEstado = (med) => {
    const fSync = new Date(med.fechaSync || new Date());
    const diff = currentDate - fSync;
    const dias = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    const dosisDia = (med.dosisMes || 0) / 30;
    const consumoAcumulado = dias * dosisDia;
    const actual = Math.max(0, (med.stockCorte || 0) - consumoAcumulado);
    const diasRestantes = dosisDia > 0 ? actual / dosisDia : 999;
    
    return {
      stockActual: parseFloat(actual.toFixed(1)),
      diasRestantes: Math.floor(diasRestantes),
      compraNecesaria: Math.ceil(Math.max(0, (dosisDia * 30) - actual)),
      estado: diasRestantes <= 2 ? 'critico' : diasRestantes <= (med.leadTime || 7) ? 'bajo' : 'ok',
      fSyncLabel: fSync.toLocaleDateString(),
      diasTranscurridos: dias,
      dosisDiaria: dosisDia
    };
  };

  const guardarCambios = async (nuevosMeds, logMsg) => {
    if (!user || !db) return;
    const newLog = { id: Date.now(), msg: logMsg, time: new Date().toISOString() };
    const nuevosLogs = [newLog, ...logs].slice(0, 15);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', 'main');
      await setDoc(docRef, { meds: nuevosMeds, logs: nuevosLogs }, { merge: true });
    } catch (e) {
      alert("Error al guardar.");
    }
  };

  const registrarSuministro = async (index) => {
    const cant = parseInt(inputVal);
    if (isNaN(cant) || cant <= 0) return;
    const med = meds[index];
    const stats = calcularEstado(med);
    const fCompra = new Date(editPurchaseDate + "T12:00:00");
    const diff = currentDate - fCompra;
    const diasD = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    const nuevoTotal = stats.stockActual + (cant - (diasD * stats.dosisDiaria));
    const nuevosMeds = meds.map((m, i) => i === index ? { ...m, stockCorte: nuevoTotal, fechaSync: new Date().toISOString() } : m);
    await guardarCambios(nuevosMeds, `Surtido: ${cant}u de ${med.nombre}`);
    setAddingStock(null);
    setInputVal("");
  };

  const confirmarEliminar = async () => {
    const nombre = meds[deletingMed].nombre;
    const nuevos = meds.filter((_, i) => i !== deletingMed);
    await guardarCambios(nuevos, `Eliminado: ${nombre}`);
    setDeletingMed(null);
  };

  const handleForm = async (e) => {
    e.preventDefault();
    const f = e.target;
    let nuevos = [...meds];
    const rawDateValue = f.fechaReferencia.value; // Nueva fecha de referencia
    const fSyncFinal = rawDateValue ? new Date(rawDateValue + "T12:00:00").toISOString() : new Date().toISOString();

    const data = {
      nombre: f.nombre.value,
      dosisMes: parseFloat(f.dosisMes.value),
      leadTime: parseInt(f.leadTime.value),
      fechaSync: fSyncFinal
    };

    if (isAddingNew) {
      nuevos.push({ ...data, stockCorte: parseFloat(f.stockManual.value || 0) });
      await guardarCambios(nuevos, `Agregado: ${data.nombre}`);
    } else {
      const actual = meds[editingMed];
      const stockAju = f.stockManual.value !== "" ? parseFloat(f.stockManual.value) : actual.stockCorte;
      nuevos[editingMed] = { ...actual, ...data, stockCorte: stockAju };
      await guardarCambios(nuevos, `Ajuste manual: ${data.nombre}`);
    }
    setEditingMed(null);
    setIsAddingNew(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={48}/></div>;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="sticky-header">
        <div className="bg-indigo-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 w-full max-w-5xl mx-4 border-none box-border">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black m-0 flex items-center justify-center md:justify-start gap-3">
              <Pill className="text-indigo-400" size={28} /> Control Tere Valencia
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
               <button onClick={() => setShowHistory(!showHistory)} className="bg-indigo-800 text-[9px] px-2 py-1 rounded border-none text-white cursor-pointer hover:bg-indigo-700 uppercase font-bold tracking-widest flex items-center gap-1 transition-all">
                 <History size={12}/> {showHistory ? 'Ocultar historial' : 'Ver historial'}
               </button>
               {dbStatus === 'online' ? <Wifi size={14} className="text-emerald-400"/> : <WifiOff size={14} className="text-red-400"/>}
            </div>
          </div>
          <div className="flex gap-2 bg-indigo-950/40 p-2 rounded-2xl">
            <button onClick={() => setView('inventory')} className={`px-5 py-2.5 rounded-xl font-black text-sm border-none cursor-pointer transition-all ${view === 'inventory' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-transparent text-indigo-200'}`}>Inventario</button>
            <button onClick={() => setView('shopping')} className={`px-5 py-2.5 rounded-xl font-black text-sm border-none cursor-pointer transition-all ${view === 'shopping' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-transparent text-indigo-200'}`}>Compras</button>
            <button onClick={() => setIsAddingNew(true)} className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-black shadow-xl ml-2 active:scale-95 border-none cursor-pointer"><Plus size={22}/></button>
          </div>
        </div>
      </div>

      <div className="main-content w-full">
        {showHistory && (
          <div className="bg-slate-800 text-slate-300 p-6 rounded-[2rem] mb-6 shadow-inner animate-in slide-in-from-top-4 duration-300">
            <p className="text-white text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={14}/> Acciones recientes:</p>
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="flex justify-between items-center text-xs border-b border-slate-700 pb-2 border-solid">
                  <span className="font-medium text-indigo-100">{l.msg}</span>
                  <span className="opacity-40 text-[10px]">{new Date(l.time).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'inventory' ? (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-solid border-slate-200 overflow-hidden w-full mt-2">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-black">
                <tr>
                  <th className="px-8 py-5">Medicamento</th>
                  <th className="px-8 py-5 text-center">Stock Estimado</th>
                  <th className="px-8 py-5 text-center">Días</th>
                  <th className="px-8 py-5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meds.map((med, index) => {
                  const s = calcularEstado(med);
                  return (
                    <tr key={index} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4 text-left">
                          <div className={`w-3.5 h-3.5 rounded-full shadow-sm shrink-0 ${s.estado === 'ok' ? 'bg-emerald-400' : s.estado === 'bajo' ? 'bg-amber-400' : 'bg-red-500'}`} />
                          <div>
                            <p className="font-black text-slate-800 m-0 text-lg leading-tight">{med.nombre}</p>
                            <p className="text-[10px] text-slate-400 m-0 mt-1 uppercase font-bold flex items-center gap-1 tracking-tighter">
                              <Calendar size={10}/> Conteo del: {s.fSyncLabel}
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
                          {addingStock === index ? (
                            <div className="bg-indigo-50 p-4 rounded-2xl border border-solid border-indigo-100 flex flex-col gap-2 animate-in zoom-in-95 duration-200">
                              <div className="flex gap-2">
                                <input type="number" className="w-16 p-2 rounded-lg border-none text-sm font-bold shadow-sm" value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder="0" />
                                <input type="date" className="p-2 rounded-lg border-none text-[10px] font-bold shadow-sm" value={editPurchaseDate} onChange={e => setEditPurchaseDate(e.target.value)} />
                              </div>
                              <button onClick={() => registrarSuministro(index)} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-[10px] font-black border-none cursor-pointer">Surtir</button>
                              <button onClick={() => setAddingStock(null)} className="text-[10px] text-slate-400 border-none bg-transparent cursor-pointer">Cerrar</button>
                            </div>
                          ) : (
                            <>
                              <button onClick={() => setAddingStock(index)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:scale-110 border-none cursor-pointer transition-transform"><PlusCircle size={22}/></button>
                              <button onClick={() => setEditingMed(index)} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 border-none cursor-pointer"><Edit3 size={18}/></button>
                              <button onClick={() => setDeletingMed(index)} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 border-none cursor-pointer"><Trash2 size={18}/></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-xl p-12 border border-solid border-slate-200 w-full mt-4 text-center">
             <div className="flex items-center justify-center gap-4 mb-10">
                <ShoppingCart className="text-indigo-600" size={40}/>
                <h2 className="m-0 text-indigo-950 text-4xl font-black tracking-tighter">Lista de Compra</h2>
             </div>
             <div className="grid md:grid-cols-2 gap-6 w-full">
                {meds.filter(m => calcularEstado(m).compraNecesaria > 0).map((med, i) => (
                  <div key={i} className="flex justify-between items-center p-8 bg-indigo-50/40 rounded-[2.5rem] border border-solid border-indigo-100 text-left transition-all hover:shadow-lg">
                    <div>
                       <span className="font-black text-slate-800 text-2xl leading-none block mb-2">{med.nombre}</span>
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dosis: {med.dosisMes}u / mes</span>
                    </div>
                    <div className="text-right">
                       <span className="text-5xl font-black text-indigo-600 leading-none">+{calcularEstado(med).compraNecesaria}</span>
                       <span className="text-[10px] block text-indigo-400 font-black uppercase mt-1 tracking-widest text-center">unidades</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Modal: Edición con Retroactividad */}
      {(isAddingNew || editingMed !== null) && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <form onSubmit={handleForm} className="bg-white p-10 rounded-[4rem] shadow-2xl max-w-sm w-full text-left border-none box-border animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="m-0 mb-8 text-3xl font-black text-slate-800 tracking-tighter">{isAddingNew ? 'Nuevo Producto' : 'Corregir Datos'}</h3>
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block tracking-widest px-1">Nombre</label>
                <input name="nombre" defaultValue={isAddingNew ? "" : meds[editingMed].nombre} className="w-full p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-bold outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block tracking-widest px-1">U. por Mes</label>
                  <input name="dosisMes" type="number" step="0.5" defaultValue={isAddingNew ? 30 : meds[editingMed].dosisMes} className="w-full p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-bold outline-none" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block tracking-widest px-1">Días Aviso</label>
                  <input name="leadTime" type="number" defaultValue={isAddingNew ? 7 : meds[editingMed].leadTime} className="p-4 w-full border border-solid border-slate-100 bg-slate-50 rounded-2xl font-bold outline-none" required />
                </div>
              </div>
              
              <div className="bg-indigo-50 p-6 rounded-3xl border border-solid border-indigo-100 text-center">
                <div className="flex items-center justify-center gap-2 mb-3 text-indigo-600">
                   <RotateCcw size={16}/>
                   <label className="text-[10px] font-black uppercase tracking-widest">Ajuste de Tiempo</label>
                </div>
                <p className="text-[9px] text-indigo-400 mb-4 leading-tight">¿Cuándo fue la última vez que este inventario estuvo correcto? El sistema restará el consumo desde ese día hasta hoy.</p>
                <input name="fechaReferencia" type="date" defaultValue={isAddingNew ? new Date().toISOString().split('T')[0] : meds[editingMed].fechaSync.split('T')[0]} className="w-full p-3 border-none bg-white rounded-xl font-black text-indigo-800 text-center shadow-sm" />
              </div>

              <div className="p-6 bg-amber-50 rounded-3xl border border-solid border-amber-100 text-center shadow-sm">
                <label className="text-[10px] font-black text-amber-600 m-0 mb-4 uppercase block tracking-widest">Inventario en esa fecha</label>
                <input name="stockManual" type="number" step="0.1" className="w-full p-4 border border-solid border-amber-200 bg-white rounded-xl font-black text-amber-700 text-center text-4xl outline-none" placeholder={isAddingNew ? "0" : `${meds[editingMed].stockCorte}`} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl border-none cursor-pointer active:scale-95 transition-all">Guardar</button>
                <button type="button" onClick={() => {setIsAddingNew(false); setEditingMed(null);}} className="px-6 bg-slate-100 text-slate-400 rounded-2xl font-bold border-none cursor-pointer">Cerrar</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Borrar */}
      {deletingMed !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
           <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-xs w-full text-center border-none animate-in zoom-in-95 duration-200">
              <AlertTriangle size={48} className="text-red-500 mx-auto mb-6"/>
              <h3 className="text-2xl font-black text-slate-800 m-0">¿Eliminar?</h3>
              <p className="text-slate-500 text-sm mt-4 font-bold uppercase tracking-widest">{meds[deletingMed]?.nombre}</p>
              <div className="flex gap-3 mt-8">
                 <button onClick={confirmarEliminar} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-sm shadow-lg border-none cursor-pointer">Eliminar</button>
                 <button onClick={() => setDeletingMed(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm border-none cursor-pointer">Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
