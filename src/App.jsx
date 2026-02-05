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
  Lock
} from 'lucide-react';

/**
 * ⚠️ CONFIGURACIÓN DE FIREBASE ⚠️
 * Pega tus llaves aquí. Asegúrate de que no queden comas ni 
 * comillas extra dentro de los valores.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAiVjwE4HzqwT5OKLP-aiJCNEm5mGkxUGM",
  authDomain: "control-medicamentos-9c9f9.firebaseapp.com",
  projectId: "control-medicamentos-9c9f9",
  storageBucket: "control-medicamentos-9c9f9.firebasestorage.app",
  messagingSenderId: "805972069626",
  appId: "1:805972069626:web:287622c95615b852070d43",           
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
  const [view, setView] = useState('inventory');
  const [addingStock, setAddingStock] = useState(null); 
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [deletingMed, setDeletingMed] = useState(null); 
  const [inputVal, setInputVal] = useState("");
  const [fechaCorte, setFechaCorte] = useState(new Date());
  const [currentDate] = useState(new Date());
  const [editPurchaseDate, setEditPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  // Estilos de centrado y scroll corregidos
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
        font-family: sans-serif !important;
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

  // CARGA DE DATOS: Ruta corregida a 6 segmentos (par)
  useEffect(() => {
    if (!user || !db) return;
    
    // Ruta: artifacts (1) / appId (2) / public (3) / data (4) / inventory (5) / main (6)
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', 'main');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setDbStatus('online');
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMeds(data.meds || []);
        if (data.fechaCorte) setFechaCorte(new Date(data.fechaCorte));
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setDbStatus('error');
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
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', 'main');
      await setDoc(docRef, { meds: nuevosMeds, fechaCorte: hoy });
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const registrarCompra = async (index) => {
    const cantidad = parseInt(inputVal);
    if (isNaN(cantidad) || cantidad <= 0) return;
    const stats = calcularEstado(meds[index]);
    const fechaCompraObj = new Date(editPurchaseDate + "T12:00:00");
    const diffTimeDesdeCompra = Math.abs(currentDate - fechaCompraObj);
    const diasDesdeCompra = Math.floor(diffTimeDesdeCompra / (1000 * 60 * 60 * 24));
    const consumoYaSucedido = Math.max(0, diasDesdeCompra * stats.dosisDiaria);
    const nuevoStockHoy = stats.stockActual + (cantidad - consumoYaSucedido);

    const nuevosMeds = meds.map((m, idx) => ({
      ...m,
      stockCorte: idx === index ? nuevoStockHoy : calcularEstado(m).stockActual
    }));
    await guardarEnNube(nuevosMeds);
    setAddingStock(null);
    setInputVal("");
  };

  const eliminarMedicamento = async () => {
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
      nuevosMeds.push({ ...medData, stockCorte: parseFloat(form.stockManual.value || 0) });
    } else {
      const stockAju = form.stockManual.value !== "" ? parseFloat(form.stockManual.value) : calcularEstado(meds[editingMed]).stockActual;
      nuevosMeds[editingMed] = { ...medData, stockCorte: stockAju };
    }

    await guardarEnNube(nuevosMeds);
    setEditingMed(null);
    setIsAddingNew(false);
  };

  if (!isConfigReady) return <div className="h-screen flex items-center justify-center bg-white p-10 text-center"><div><Database className="text-red-500 mb-4 mx-auto" size={48}/><h2 className="text-xl font-bold">Falta Configuración</h2><p className="text-slate-500">Pega tus llaves en App.jsx.</p></div></div>;

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-100"><Loader2 className="animate-spin text-indigo-600" size={48}/></div>;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="sticky-header">
        <div className="bg-indigo-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 w-full max-w-5xl mx-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black m-0 flex items-center gap-3">
              <Pill className="text-indigo-400" size={28} /> Control Tere Valencia
            </h1>
            <p className="text-indigo-200 text-xs m-0 mt-2 opacity-80 flex items-center justify-center md:justify-start gap-2 font-medium">
               <History size={14}/> Sincronizado: {fechaCorte.toLocaleDateString()} 
               {dbStatus === 'online' ? <Wifi size={14} className="text-emerald-400"/> : <WifiOff size={14} className="text-red-400"/>}
            </p>
          </div>
          <div className="flex gap-2 bg-indigo-950/40 p-2 rounded-2xl">
            <button onClick={() => setView('inventory')} className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${view === 'inventory' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-transparent text-indigo-200'}`}>Inventario</button>
            <button onClick={() => setView('shopping')} className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${view === 'shopping' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-transparent text-indigo-200'}`}>Compras</button>
            <button onClick={() => setIsAddingNew(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-black shadow-xl ml-2 active:scale-95"><Plus size={20}/></button>
          </div>
        </div>
      </div>

      <div className="main-content">
        {view === 'inventory' ? (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-solid border-slate-200 overflow-hidden w-full mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-black">
                  <tr>
                    <th className="px-8 py-5">Medicamento</th>
                    <th className="px-8 py-5 text-center">Stock</th>
                    <th className="px-8 py-5 text-center">Días</th>
                    <th className="px-8 py-5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {meds.map((med, index) => {
                    const stats = calcularEstado(med);
                    return (
                      <tr key={index} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${stats.estado === 'ok' ? 'bg-emerald-400' : stats.estado === 'bajo' ? 'bg-amber-400' : 'bg-red-500'}`} />
                            <p className="font-bold text-slate-800 m-0 text-base leading-tight">{med.nombre}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center font-mono font-black text-xl text-slate-700">{stats.stockActual}</td>
                        <td className="px-8 py-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black border border-solid ${
                            stats.estado === 'critico' ? 'bg-red-50 text-red-600 border-red-100' : 
                            stats.estado === 'bajo' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {stats.diasRestantes}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center items-center gap-2">
                            {addingStock === index ? (
                              <div className="flex flex-col gap-2 bg-indigo-50 p-3 rounded-xl border border-solid border-indigo-100 animate-in zoom-in-95">
                                <input type="number" className="p-2 rounded-lg border border-solid border-indigo-200 text-sm font-bold outline-none" value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder="Cant." />
                                <input type="date" className="p-2 rounded-lg border border-solid border-indigo-200 text-[10px] outline-none" value={editPurchaseDate} onChange={e => setEditPurchaseDate(e.target.value)} />
                                <div className="flex gap-1">
                                  <button onClick={() => registrarCompra(index)} className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-[10px] font-black">OK</button>
                                  <button onClick={() => setAddingStock(null)} className="p-1.5 bg-slate-300 text-white rounded-lg"><X size={12}/></button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => setAddingStock(index)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:scale-110 transition-transform"><PlusCircle size={22}/></button>
                                <button onClick={() => setEditingMed(index)} className="p-2 bg-slate-100 text-slate-400 rounded-xl"><Edit3 size={18}/></button>
                                <button onClick={() => setDeletingMed(index)} className="p-2 bg-red-50 text-red-400 rounded-xl"><Trash2 size={18}/></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {meds.length === 0 && <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Inventario Vacío</div>}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-xl p-10 border border-solid border-slate-200 w-full mt-4">
             <h2 className="m-0 mb-8 flex items-center justify-center gap-3 text-indigo-900 text-2xl font-black">
                <ShoppingCart className="text-indigo-600" size={32}/> Lista de Compra
             </h2>
             <div className="grid md:grid-cols-2 gap-4 w-full">
                {meds.filter(m => calcularEstado(m).compraNecesaria > 0).map((med, i) => (
                  <div key={i} className="flex justify-between items-center p-6 bg-indigo-50/40 rounded-3xl border border-solid border-indigo-100">
                    <span className="font-black text-slate-800 text-lg leading-tight">{med.nombre}</span>
                    <span className="text-3xl font-black text-indigo-600">+{calcularEstado(med).compraNecesaria}</span>
                  </div>
                ))}
             </div>
             {meds.filter(m => calcularEstado(m).compraNecesaria > 0).length === 0 && (
               <div className="py-10 text-emerald-500 bg-emerald-50 rounded-3xl border border-dashed border-emerald-200 text-center">
                 <CheckCircle2 size={40} className="mx-auto mb-2 opacity-40" />
                 <p className="font-black m-0">Todo surtido</p>
               </div>
             )}
          </div>
        )}

        {/* Modales */}
        {(isAddingNew || editingMed !== null) && (
          <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <form onSubmit={procesarFormulario} className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-left">
              <h3 className="m-0 mb-8 text-2xl font-black text-slate-800">{isAddingNew ? 'Nuevo' : 'Editar'}</h3>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block tracking-widest px-1">Nombre</label>
                  <input name="nombre" defaultValue={isAddingNew ? "" : meds[editingMed].nombre} className="w-full p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-bold outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input name="dosisMes" type="number" step="0.5" defaultValue={isAddingNew ? 30 : meds[editingMed].dosisMes} className="p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="u/mes" required />
                  <input name="leadTime" type="number" defaultValue={isAddingNew ? 7 : meds[editingMed].leadTime} className="p-4 border border-solid border-slate-100 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="Aviso (d)" required />
                </div>
                <div className="p-6 bg-amber-50 rounded-3xl border border-solid border-amber-100 text-center">
                  <label className="text-[10px] font-black text-amber-600 m-0 mb-4 uppercase block tracking-widest">Stock Físico Hoy</label>
                  <input name="stockManual" type="number" step="0.1" className="w-full p-4 border border-solid border-amber-200 bg-white rounded-xl font-black text-amber-700 text-center text-3xl outline-none" placeholder={isAddingNew ? "0" : `Est: ${calcularEstado(meds[editingMed]).stockActual}`} />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Guardar</button>
                  <button type="button" onClick={() => {setIsAddingNew(false); setEditingMed(null);}} className="px-6 bg-slate-100 text-slate-400 rounded-2xl font-bold">Cerrar</button>
                </div>
              </div>
            </form>
          </div>
        )}

        {deletingMed !== null && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
             <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-xs w-full text-center">
                <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-800 m-0">¿Borrar?</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">Se eliminará {meds[deletingMed]?.nombre}</p>
                <div className="flex gap-3 mt-6">
                   <button onClick={eliminarMedicamento} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-sm shadow-lg">Eliminar</button>
                   <button onClick={() => setDeletingMed(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm">Cancelar</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;