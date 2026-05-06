import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Clock, Calendar, Pill, AlertCircle, ChevronRight } from 'lucide-react';

const App = () => {
  const [medications, setMedications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
    time: '',
    notes: ''
  });

  // Cargar datos iniciales o manejar persistencia local simple
  useEffect(() => {
    const saved = localStorage.getItem('meds_data');
    if (saved) {
      setMedications(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('meds_data', JSON.stringify(medications));
  }, [medications]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMed(prev => ({ ...prev, [name]: value }));
  };

  const addMedication = (e) => {
    e.preventDefault();
    if (!newMed.name || !newMed.time) return;

    const medication = {
      ...newMed,
      id: Date.now(),
      lastTaken: null,
      history: []
    };

    setMedications([...medications, medication]);
    setNewMed({ name: '', dosage: '', frequency: '', time: '', notes: '' });
    setShowForm(false);
  };

  const deleteMedication = (id) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const toggleTaken = (id) => {
    const now = new Date().toLocaleString();
    setMedications(medications.map(m => {
      if (m.id === id) {
        return {
          ...m,
          lastTaken: now,
          history: [now, ...m.history].slice(0, 5) // Guardar últimas 5 tomas
        };
      }
      return m;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Pill className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">MedControl</h1>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-full font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            {showForm ? 'Cerrar' : <><Plus size={20} /> Añadir</>}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Formulario de Adición */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="text-indigo-600" /> Nuevo Medicamento
            </h2>
            <form onSubmit={addMedication} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Nombre del Medicamento</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Ej: Ibuprofeno"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={newMed.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Dosis</label>
                <input
                  type="text"
                  name="dosage"
                  placeholder="Ej: 600mg"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={newMed.dosage}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Frecuencia</label>
                <input
                  type="text"
                  name="frequency"
                  placeholder="Ej: Cada 8 horas"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={newMed.frequency}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Hora de la toma</label>
                <input
                  type="time"
                  name="time"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={newMed.time}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-600">Notas adicionales</label>
                <textarea
                  name="notes"
                  placeholder="Ej: Tomar después de comer"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-20"
                  value={newMed.notes}
                  onChange={handleInputChange}
                />
              </div>
              <button 
                type="submit"
                className="md:col-span-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                Guardar Medicamento
              </button>
            </form>
          </div>
        )}

        {/* Lista de Medicamentos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" /> 
              Tus medicamentos actuales
            </h2>
            <span className="text-sm text-slate-500">{medications.length} registrados</span>
          </div>

          {medications.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No hay medicamentos registrados.</p>
              <button 
                onClick={() => setShowForm(true)}
                className="mt-4 text-indigo-600 font-bold hover:underline"
              >
                Comienza añadiendo uno ahora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medications.map((med) => (
                <div key={med.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-3 rounded-xl">
                          <Pill className="text-indigo-600" size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">{med.name}</h3>
                          <p className="text-indigo-600 text-sm font-semibold">{med.dosage}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteMedication(med.id)}
                        className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Clock size={16} className="text-slate-400" />
                        <span>{med.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Calendar size={16} className="text-slate-400" />
                        <span>{med.frequency}</span>
                      </div>
                    </div>

                    {med.notes && (
                      <div className="bg-slate-50 p-3 rounded-lg mb-4 text-xs text-slate-500 italic">
                        "{med.notes}"
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="text-[10px] text-slate-400">
                        {med.lastTaken ? (
                          <span>Última toma: <br/><b>{med.lastTaken}</b></span>
                        ) : (
                          "Sin tomas registradas"
                        )}
                      </div>
                      <button 
                        onClick={() => toggleTaken(med.id)}
                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 border border-emerald-100"
                      >
                        <CheckCircle size={16} /> Tomado
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        <p>Control de Medicamentos v1.0 • Tus datos se guardan localmente en tu navegador.</p>
      </footer>
    </div>
  );
};

export default App;
