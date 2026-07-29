import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Layers, Plus, Trash2, FolderTree, Gamepad2, Loader2, AlertCircle, LayoutGrid, Tag, ChevronRight } from 'lucide-react';

interface Game { id: string; name: string; }
interface Category { id: string; name: string; slug: string; game_id: string; games?: { name: string }; }
interface Expansion { id: string; name: string; slug: string; game_id: string; games?: { name: string }; }

export default function TaxonomyEngine() {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expansions, setExpansions] = useState<Expansion[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newCatGame, setNewCatGame] = useState('');
  const [newExpName, setNewExpName] = useState('');
  const [newExpGame, setNewExpGame] = useState('');
  
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [isSubmittingExp, setIsSubmittingExp] = useState(false);

  // Estado para la sección exploradora inferior
  const [selectedGameExplorer, setSelectedGameExplorer] = useState<string>('');

  const createSlug = (text: string) => text.toLowerCase().trim().replace(/[\s\W-]+/g, '-');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gamesRes, catRes, expRes] = await Promise.all([
        supabase.from('games').select('*').order('name'),
        supabase.from('categories').select('*, games(name)').order('name'),
        supabase.from('expansions').select('*, games(name)').order('name')
      ]);
      if (gamesRes.data) {
        setGames(gamesRes.data);
        if (gamesRes.data.length > 0 && !selectedGameExplorer) {
          setSelectedGameExplorer(gamesRes.data[0].id);
        }
      }
      if (catRes.data) setCategories(catRes.data);
      if (expRes.data) setExpansions(expRes.data);
    } catch (error) {
      console.error("Error fetching taxonomy:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatGame) return;
    setIsSubmittingCat(true);
    const slug = createSlug(newCatName);
    
    const { error } = await supabase.from('categories').insert([{ name: newCatName, slug, game_id: newCatGame }]);
    setIsSubmittingCat(false);
    
    if (!error) {
      setNewCatName('');
      fetchData();
    } else {
      alert('Error al crear categoría: ' + error.message);
    }
  };

  const handleAddExpansion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpName || !newExpGame) return;
    setIsSubmittingExp(true);
    const slug = createSlug(newExpName);
    
    const { error } = await supabase.from('expansions').insert([{ name: newExpName, slug, game_id: newExpGame }]);
    setIsSubmittingExp(false);
    
    if (!error) {
      setNewExpName('');
      fetchData();
    } else {
      alert('Error al crear expansión: ' + error.message);
    }
  };

  const handleDelete = async (table: 'categories' | 'expansions', id: string) => {
    if (!window.confirm('¿Eliminar este elemento? Podría afectar a los productos que lo usen.')) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) fetchData();
    else alert('Error al eliminar: ' + error.message);
  };

  // Categorías pertenecientes a la franquicia seleccionada en el explorador
  const explorerCategories = categories.filter(c => c.game_id === selectedGameExplorer);
  const selectedGameName = games.find(g => g.id === selectedGameExplorer)?.name || 'Franquicia';

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-red-500" /></div>;

  return (
    <div className="space-y-10 w-full max-w-7xl mx-auto p-6">
      <div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">Gestor de Taxonomía</h2>
        <p className="text-sm text-muted-foreground mt-1">Crea y administra las categorías y expansiones de tus franquicias.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* PANEL DE CATEGORÍAS */}
        <div className="bg-card border border-border rounded-[2rem] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center border border-red-500/20">
              <FolderTree className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-black text-foreground uppercase tracking-wider">Categorías</h3>
          </div>
          
          <form onSubmit={handleAddCategory} className="p-6 border-b border-border space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select 
                required value={newCatGame} onChange={(e) => setNewCatGame(e.target.value)}
                className="bg-input border border-border text-foreground text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-red-500/50"
              >
                <option value="">1. Elige Franquicia</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <input 
                required type="text" placeholder="2. Nombre Categoría" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                className="bg-input border border-border text-foreground text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-red-500/50"
              />
            </div>
            <button disabled={isSubmittingCat || !newCatName || !newCatGame} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {isSubmittingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear Categoría
            </button>
          </form>

          <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
                <div>
                  <p className="font-bold text-foreground text-sm">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{cat.games?.name}</p>
                </div>
                <button onClick={() => handleDelete('categories', cat.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL DE EXPANSIONES */}
        <div className="bg-card border border-border rounded-[2rem] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
              <Layers className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-black text-foreground uppercase tracking-wider">Expansiones / Sets</h3>
          </div>
          
          <form onSubmit={handleAddExpansion} className="p-6 border-b border-border space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select 
                required value={newExpGame} onChange={(e) => setNewExpGame(e.target.value)}
                className="bg-input border border-border text-foreground text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50"
              >
                <option value="">1. Elige Franquicia</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <input 
                required type="text" placeholder="2. Nombre Expansión" value={newExpName} onChange={(e) => setNewExpName(e.target.value)}
                className="bg-input border border-border text-foreground text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <button disabled={isSubmittingExp || !newExpName || !newExpGame} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {isSubmittingExp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear Expansión
            </button>
          </form>

          <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-2">
            {expansions.map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
                <div>
                  <p className="font-bold text-foreground text-sm">{exp.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{exp.games?.name}</p>
                </div>
                <button onClick={() => handleDelete('expansions', exp.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* COMPONENTE SEPARADO: EXPLORADOR DE CATEGORÍAS POR FRANQUICIA         */}
      {/* ==================================================================== */}
      <div className="bg-card border border-border rounded-[2rem] p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <LayoutGrid className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground italic uppercase tracking-wider">
                EXPLORADOR DE CATEGORÍAS POR FRANQUICIA
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Selecciona una franquicia para inspeccionar ordenada y exclusivamente sus categorías asociadas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              TOTAL EN {selectedGameName}:
            </span>
            <span className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-black px-3 py-1 rounded-full">
              {explorerCategories.length}
            </span>
          </div>
        </div>

        {/* Pestañas de Selección de Franquicia (Basadas en la tabla `games`) */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {games.map((g) => {
            const isSelected = selectedGameExplorer === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGameExplorer(g.id)}
                className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shrink-0 border ${
                  isSelected
                    ? "bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/20"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-amber-400/40 hover:text-foreground"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>

        {/* Rejilla de Categorías Filtradas por game_id */}
        <div className="pt-2">
          {explorerCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {explorerCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 bg-muted/20 border border-border hover:border-amber-400/50 rounded-xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-tight text-foreground group-hover:text-amber-400 transition-colors">
                      {cat.name}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs border border-dashed border-border rounded-xl">
              NO HAY CATEGORÍAS REGISTRADAS PARA {selectedGameName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}