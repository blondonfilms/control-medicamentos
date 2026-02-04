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
  Calendar as CalendarIcon,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  Lock,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';

/**
 * ⚠️ CONFIGURACIÓN DE FIREBASE ⚠️
 * Mantén tus llaves aquí para que la conexión siga activa.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAiVjwE4HzqwT5OKLP-aiJCNEm5mGkxUGM",
  authDomain: "control-medicamentos-9c9f9.firebaseapp.com",
  projectId: "control-medicamentos-9c9f9",
  storageBucket: "control-medicamentos-9c9f9.firebasestorage.app",
  messagingSenderId: "805972069626",
  appId: "1:805972069626:web:287622c95615b852070d43",           
};

const appId = "med-tracker-tere";
const isConfigReady = firebaseConfig && firebaseConfig.apiKey !== "";

// Inicialización de servicios
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
  const [view, setView] = useState('inventory');
  const [addingStock, setAddingStock] = useState(null); 
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [deletingMed, setDeletingMed] = useState(null); 
  const [inputVal, setInputVal] = useState("");
  const [fechaCorte, setFechaCorte] = useState(new Date());
  const [currentDate] = useState(new Date());
  const [editPurchaseDate, setEditPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. ESTILOS DE CENTRADO TOTAL Y CORRECCIÓN DE SCROLL
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
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        overflow-x: hidden !important;
      }
      #root { 
        max-width: 100% !important;
        width: 100% !important;
        display: flex !important;
        justify-content: center !important;
      }
      .main-content {
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 0 1rem 4rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .sticky-header {
        position: sticky;
        top: 0;
        z-index: 40;
        width: 100%;
        background-color: #f1f5f9;
        padding-top: 1.5rem;
        padding-bottom: 1rem;
        display: flex;
        justify-content: center;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // 2. CONEXIÓN Y AUTENTICACIÓN
  useEffect(() => {
    if (!isConfigReady) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch (e) { setDbStatus('error'); }
      } else { setUser(u); }
    });
    return () => unsubscribe();
  }, []);

  // 3. CARGA DE DATOS
  useEffect(() => {
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'config', 'medicationData');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setDbStatus('online');
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMeds(data.meds || []);
        if (data.fechaCorte) setFechaCorte(new Date(data.fechaCorte));
      } else { setMeds([]); }
      setLoading(false);
    }, (error) => {
      setDbStatus(error.code === 'permission-denied' ? 'permission-error' : 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const calcularEstado = (med) => {
    const diffTime = Math.abs(currentDate - fechaCorte);
    const diasTranscurridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const dosisDiaria = (med.dosisMes || 0) / 30;
    const consumoAcumulado = diasTranscurridos * dosisDiaria;
    const stockActual = Math.max(0, (med.stockCorte || 0) - consumoAcumulado);
    const diasRestantes = dosisDiaria > 0 ? stockActual / dosisDiaria : 999;
    const leadTime = med.leadTime || 7;
    const compraNecesaria = Math.ceil(Math.max(0, (dosisDiaria * 30) - stockActual));

    return {
      stockActual: parseFloat(stockActual.toFixed(1)),
      diasRestantes: Math.floor(diasRestantes),
      compraNecesaria,
      estado: diasRestantes <= 2 ? 'critico' : diasRestantes <= leadTime ? 'bajo' : 'ok',
      dosisDiaria
    };
  };

  const guardarEnNube = async (nuevosMeds) => {
    if (!user || !db) return;
    const hoy = new Date().toISOString();
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'config', 'medicationData');
      await setDoc(docRef, { meds: nuevosMeds, fechaCorte: hoy });
    } catch (error) {
      alert("Error al sincronizar con la nube.");
    }
  };

  // LÓGICA DE REGISTRO INTELIGENTE REINSTAURADA
  const registrarCompra = async (index) => {
    const cantidad = parseInt(inputVal);
    if (isNaN(cantidad) || cantidad <= 0) return;
    
    const stats = calcularEstado(meds[index]);
    
    // Calculamos cuánto se ha consumido desde la fecha de compra hasta HOY
    const fechaCompraObj = new Date(editPurchaseDate + "T12:00:00");
    const diffTimeDesdeCompra = Math.abs(currentDate - fechaCompraObj);
    const diasDesdeCompra = Math.floor(diffTimeDesdeCompra / (1000 * 60 * 60 * 24));
    
    // Si la compra fue hace 5 días, restamos 5 días de dosis a la cantidad que entró
    const consumoYaSucedido = Math.max(0, diasDesdeCompra * stats.dosisDiaria);
    const cantidadNetaAAgregar = cantidad - consumoYaSucedido;
    
    // El nuevo stock para "Hoy" es el stock actual calculado + lo que sobró de la compra
    const nuevoStockHoy = stats.stockActual + cantidadNetaAAgregar;

    const nuevosMeds = meds.map((m, idx) => ({
      ...m,
      stockCorte: idx === index ? nuevoStockHoy : calcularEstado(m).stockActual,
      lastQty: idx === index ? cantidad : (m.lastQty || 0),
      lastDate: idx === index ? fechaCompraObj.toISOString() : (m.lastDate || null)
    }));

    await guardarEnNube(nuevosMeds);
    setAddingStock(null);
    setInputVal("");
    setEditPurchaseDate(new Date().toISOString().split('T')[0]);
  };

  const eliminarMedicamento = async () => {
    if (deletingMed === null) return;
    const nuevosMeds = meds.filter((_, idx) => idx !== deletingMed);
    await guardarEnNube(nuevosMeds);
    setDeletingMed(null);
  };

  const procesarFormulario = async (e) => {
    e.preventDefault();
    const form = e.target;
    let nuevosMeds = [...meds];
    const medData = {
      nombre: form.nombre.value,
      dosisMes: parseFloat(form.dosisMes.value),
      leadTime: parseInt(form.leadTime.value),
    };

    if (isAddingNew) {
      const stockIni = parseFloat(form.stockManual.value || 0);
      nuevosMeds.push({ ...medData, stockCorte: stockIni, lastQty: 0, lastDate: null });
    } else {
      const stockAju = form.stockManual.value !== "" ? parseFloat(form.stockManual.value) : calcularEstado(meds[editingMed]).stockActual;
      nuevosMeds[editingMed] = { ...nuevosMeds[editingMed], ...medData, stockCorte: stockAju };
    }

    const finalMeds = nuevosMeds.map(m => ({ ...m, stockCorte: calcularEstado(m).stockActual }));
    await guardarEnNube(finalMeds);
    setEditingMed(null);
    setIsAddingNew(false);
  };

  if (!isConfigReady) return <div className="h-screen flex items-center justify-center font-sans bg-white text-center p-10"><div><Database className="text-red-500 mb-4 mx-auto" size={48} /><h2 className="text-xl font-bold text-slate-800">Falta Configuración</h2><p className="text-slate-500">Pega tus llaves en App.jsx usando BBEdit.</p></div></div>;
  if (loading && dbStatus === 'connecting') return <div className="h-screen flex flex-col items-center justify-center bg-slate-100 gap-4 font-sans text-center"><Loader2 className="animate-spin text-indigo-600" size={48}/><p className="font-bold text-slate-400">Iniciando aplicación...</p></div>;

  if (dbStatus === 'permission-error') return (
    <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center w-full">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl max-w-2xl w-full text-center">
        <Lock className="text-red-500 mb-6 mx-auto" size={60} />
        <h2 className="text-4xl font-black text-slate-800 m-0 tracking-tight leading-none">Acceso Denegado</h2>
        <p className="text-slate-500 mt-6 text-lg leading-relaxed">Firebase no permite guardar datos. Revisa la pestaña <b>Rules</b> y dale clic a <b>PUBLISH</b>.</p>
        <button onClick={() => window.location.reload()} className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-2xl font-black border-none cursor-pointer hover:bg-indigo-700 text-xl shadow-xl">Reintentar</button>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center">
      <div className="sticky-header">
        <div className="bg-indigo-900 text-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 w-full max-w-5xl border-none box-border mx-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black m-0 tracking-tighter flex items-center justify-center md:justify-start gap-4 leading-none text-white">
              <Pill className="text-indigo-400" size={32} /> Control: Tere Valencia
            </h1>
            <p className="text-indigo-200 text-xs md:text-sm m-0 mt-3 font-medium opacity-80">
              <History className="inline mr-2" size={14}/> Sincronizado: {fechaCorte.toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2 bg-indigo-950/40 p-2 rounded-[1.5rem] shadow-inner">
            <button onClick={() => setView('inventory')} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-black border-none cursor-pointer transition-all ${view === 'inventory' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-transparent text-indigo-200 hover:text-white'}`}>Inventario</button>
            <button onClick={() => setView('shopping')} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-black border-none cursor-pointer transition-all ${view === 'shopping' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-transparent text-indigo-200 hover:text-white'}`}>Compras</button>
            <button onClick={() => setIsAddingNew(true)} className="bg-emerald-500 text-white px-4 md:px-5 py-2 md:py-3 rounded-xl font-black border-none cursor-pointer hover:bg-emerald-400 shadow-xl ml-2"><Plus size={24}/></button>
          </div>
        </div>
      </div>

      <div className="main-content w-full">
        {view === 'inventory' ? (
          <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-solid border-slate-200 overflow-hidden w-full mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-[0.3em] font-black">
                  <tr>
                    <th className="px-6 md:px-10 py-6 border-none">Medicamento</th>
                    <th className="px-6 md:px-10 py-6 text-center border-none">Stock Hoy</th>
                    <th className="px-6 md:px-10 py-6 text-center border-none">Reserva</th>
                    <th className="px-6 md:px-10 py-6 text-center border-none">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {meds.map((med, index) => {
                    const stats = calcularEstado(med);
                    return (
                      <tr key={index} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 md:px-10 py-8 border-none text-left">
                          <div className="flex items-center gap-4">
                            <div className={`w-4 h-4 rounded-full shadow-inner shrink-0 ${stats.estado === 'ok' ? 'bg-emerald-400' : stats.estado === 'bajo' ? 'bg-amber-400' : 'bg-red-500'}`} />
                            <div>
                              <p className="font-black text-slate-800 m-0 text-lg md:text-xl leading-none">{med.nombre}</p>
                              <p className="text-[10px] text-slate-400 m-0 font-black mt-2 uppercase tracking-widest">{med.dosisMes} u / mes</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 md:px-10 py-8 text-center border-none font-mono font-black text-2xl md:text-3xl text-slate-700">{stats.stockActual}</td>
                        <td className="px-6 md:px-10 py-8 text-center border-none">
                          <span className={`px-3 md:px-4 py-1.5 rounded-xl text-[10px] font-black shadow-sm tracking-widest border border-solid ${
                            stats.estado === 'critico' ? 'bg-red-50 text-red-600 border-red-100' : 
                            stats.estado === 'bajo' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {stats.diasRestantes} DÍAS
                          </span>
                        </td>
                        <td className="px-6 md:px-10 py-8 border-none">
                          <div className="flex justify-center items-center gap-2">
                            {addingStock === index ? (
                              <div className="flex flex-col gap-2 bg-indigo-50 p-4 rounded-3xl animate-in slide-in-from-right-4 border border-solid border-indigo-100">
                                <div className="flex gap-2">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-indigo-400 uppercase ml-1">Cantidad</label>
                                    <input type="number" className="w-16 p-2 rounded-lg border border-solid border-indigo-200 text-sm font-bold shadow-sm outline-none" value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder="0" />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-indigo-400 uppercase ml-1">Fecha Suministro</label>
                                    <input type="date" className="p-2 rounded-lg border border-solid border-indigo-200 text-xs font-bold shadow-sm outline-none" value={editPurchaseDate} onChange={e => setEditPurchaseDate(e.target.value)} />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => registrarCompra(index)} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-xs font-black border-none cursor-pointer hover:bg-indigo-700">Registrar Entrega</button>
                                  <button onClick={() => setAddingStock(null)} className="px-3 bg-slate-300 text-white rounded-xl border-none cursor-pointer"><X size={16}/></button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => setAddingStock(index)} className="p-2 md:p-3 bg-indigo-50 text-indigo-600 border-none rounded-2xl cursor-pointer hover:bg-indigo-100 transition-all hover:scale-110 active:scale-95" title="Surtir Caja"><PlusCircle size={28}/></button>
                                <button onClick={() => setEditingMed(index)} className="p-2 md:p-3 bg-slate-100 text-slate-400 border-none rounded-2xl cursor-pointer hover:bg-slate-200 transition-all" title="Editar / Ajustar Stock"><Edit3 size={24}/></button>
                                <button onClick={() => setDeletingMed(index)} className="p-2 md:p-3 bg-red-50 text-red-400 border-none rounded-2xl cursor-pointer hover:bg-red-100 transition-all" title="Eliminar"><Trash2 size={24}/></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {meds.length === 0 && <tr><td colSpan="4" className="py-24 text-center text-slate-400 font-bold">Inventario Vacío. Pulsa "+" para empezar.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-solid border-slate-200 w-full text-center mt-4">
             <h2 className="m-0 mb-10 flex items-center justify-center gap-4 text-indigo-950 text-3xl md:text-4xl font-black text-left">
                <ShoppingCart className="text-indigo-600" size={40}/> Lista de Compra
             </h2>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {meds.filter(m => calcularEstado(m).compraNecesaria > 0).map((med, i) => (
                  <div key={i} className="flex flex-col justify-between p-8 bg-indigo-50/40 rounded-[2.5rem] border border-solid border-indigo-100 shadow-sm text-left">
                    <span className="font-black text-slate-800 text-xl block mb-6 border-b border-solid border-indigo-100/50 pb-2 leading-tight">{med.nombre}</span>
                    <div className="flex justify-between items-end">
                       <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Unidades</span>
                       <span className="text-4xl md:text-5xl font-black text-indigo-600 leading-none">+{calcularEstado(med).compraNecesaria}</span>
                    </div>
                  </div>
                ))}
             </div>
             {meds.filter(m => calcularEstado(m).compraNecesaria > 0).length === 0 && (
               <div className="py-20 text-emerald-500 bg-emerald-50 rounded-[3rem] border border-dashed border-emerald-200">
                 <CheckCircle2 size={60} className="mx-auto mb-4 opacity-40" />
                 <p className="font-black text-2xl m-0">No necesitas comprar nada</p>
               </div>
             )}
          </div>
        )}

        {(isAddingNew || editingMed !== null) && (
          <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <form onSubmit={procesarFormulario} className="bg-white p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] shadow-2xl max-w-sm w-full border-none box-border text-left animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-10">
                <h3 className="m-0 text-2xl md:text-3xl font-black text-slate-800 tracking-tighter leading-none">{isAddingNew ? 'Nuevo' : 'Editar'}</h3>
                <button type="button" onClick={() => {setIsAddingNew(false); setEditingMed(null);}} className="text-slate-300 hover:text-slate-500 transition-colors bg-transparent border-none cursor-pointer"><X size={36}/></button>
              </div>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block tracking-widest px-1">Nombre</label>
                  <input name="nombre" placeholder="Metoprolol 100mg" defaultValue={isAddingNew ? "" : meds[editingMed].nombre} className="w-full p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-black text-lg outline-none box-border focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 px-1">u/mes</label>
                    <input name="dosisMes" type="number" step="0.5" defaultValue={isAddingNew ? 30 : meds[editingMed].dosisMes} className="w-full p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-black outline-none box-border shadow-inner" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 px-1">Aviso(d)</label>
                    <input name="leadTime" type="number" defaultValue={isAddingNew ? 7 : meds[editingMed].leadTime} className="w-full p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-black outline-none box-border shadow-inner" required />
                  </div>
                </div>
                
                <div className="p-6 bg-amber-50 rounded-[2.5rem] border border-solid border-amber-100 text-center">
                  <label className="text-[10px] font-black text-amber-600 m-0 mb-4 uppercase block tracking-widest font-black">Stock Físico Hoy</label>
                  <p className="text-[9px] text-amber-500 mb-2 italic">Solo usa este campo si quieres sobreescribir el inventario manualmente con lo que tienes en la mano.</p>
                  <input name="stockManual" type="number" step="0.1" className="w-full p-4 border border-solid border-amber-200 bg-white rounded-xl font-black text-amber-700 text-center text-4xl outline-none box-border shadow-md" placeholder={isAddingNew ? "0" : `Est: ${calcularEstado(meds[editingMed]).stockActual}`} />
                </div>
                
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black border-none cursor-pointer hover:bg-indigo-700 shadow-2xl text-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                   <Save size={24}/> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        )}

        {deletingMed !== null && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
             <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border-none animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                   <AlertTriangle size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 m-0 leading-none">¿Borrar Medicamento?</h3>
                <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                   Estás por eliminar <b>{meds[deletingMed]?.nombre}</b> de la lista. Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3 mt-8">
                   <button onClick={eliminarMedicamento} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black border-none cursor-pointer hover:bg-red-700 transition-all shadow-lg active:scale-95">Sí, Eliminar</button>
                   <button onClick={() => setDeletingMed(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black border-none cursor-pointer hover:bg-slate-200 transition-all">Cancelar</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;