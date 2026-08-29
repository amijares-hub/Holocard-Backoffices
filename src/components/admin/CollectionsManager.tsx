"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  FolderPlus, 
  Trash2, 
  Package, 
  Plus, 
  Sparkles, 
  Check, 
  Search,
  Layers,
  RefreshCw,
  ChevronRight,
  Tag,
  Pencil,
  X,
  CheckSquare,
  Square,
  AlertTriangle
} from "lucide-react"
import { supabase } from "../../lib/supabase"

type Collection = {
  id: string
  name: string
  created_at?: string
  product_count?: number
}

type Product = {
  id: string
  name: string
  image_url?: string
  price: number
  category?: string
  tags?: string[] | string
  collection?: string
}

const findValueByKeywords = (obj: any, keywords: string[]) => {
  if (!obj || typeof obj !== 'object') return null;
  const keys = Object.keys(obj);
  
  for (let key of keys) {
    const normalizedKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (keywords.some(kw => normalizedKey.includes(kw))) {
      return obj[key];
    }
  }
  return null;
};

const normalizeText = (text: string = "") => {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

export function CollectionsManager() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [assignedProductIds, setAssignedProductIds] = useState<Set<string>>(new Set());
  
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCollectionCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Rename state
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Bulk action state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      const { data: colsData } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: prodsData } = await supabase
        .from('products')
        .select('*');

      const { data: pivotData } = await supabase
        .from('product_collections')
        .select('*');

      const formattedProds: Product[] = (prodsData || []).map((p: any) => {
        let rawImg = findValueByKeywords(p, ["imag", "img", "portad", "thumb", "foto", "pic", "image_url"]);
        let finalImg = rawImg || "";
        if (Array.isArray(finalImg)) finalImg = finalImg[0];
        if (typeof finalImg === 'object' && finalImg !== null) finalImg = Object.values(finalImg)[0];

        let rawTags = p.tags || p.etiquetas || p.collection || findValueByKeywords(p, ["tag", "etiquet", "collect"]);

        return {
          id: String(p.id),
          name: p.name || p.title || p.producto || "Producto TCG",
          image_url: finalImg,
          price: parseFloat(p.base_price) || parseFloat(p.price) || parseFloat(p.precio) || 0,
          category: p.category || "",
          tags: rawTags,
          collection: p.collection || ""
        };
      });

      const tagsFromInventory = new Set<string>();
      formattedProds.forEach(p => {
        let raw = p.tags;
        if (Array.isArray(raw)) {
          raw.forEach(t => typeof t === 'string' && t.trim() && tagsFromInventory.add(t.trim().toUpperCase()));
        } else if (typeof raw === 'string') {
          raw.split(',').forEach(t => t.trim() && tagsFromInventory.add(t.trim().toUpperCase()));
        }
      });

      const collectionsMap = new Map<string, Collection>();

      (colsData || []).forEach((c: any) => {
        const cName = String(c.name || c.nombre || "").toUpperCase();
        if (cName) {
          collectionsMap.set(cName, {
            id: String(c.id),
            name: cName,
            created_at: c.created_at,
            product_count: 0
          });
        }
      });

      tagsFromInventory.forEach(tag => {
        if (tag && !collectionsMap.has(tag)) {
          collectionsMap.set(tag, {
            id: `tag-${tag.toLowerCase()}`,
            name: tag,
            product_count: 0
          });
        }
      });

      const allCollections = Array.from(collectionsMap.values());

      const pivotCounts = new Map<string, Set<string>>();
      (pivotData || []).forEach((pc: any) => {
        const cId = String(pc.collection_id);
        if (!pivotCounts.has(cId)) pivotCounts.set(cId, new Set());
        pivotCounts.get(cId)!.add(String(pc.product_id));
      });

      allCollections.forEach(col => {
        const colNorm = normalizeText(col.name);
        const matchedProds = formattedProds.filter(p => {
          if (pivotCounts.has(col.id) && pivotCounts.get(col.id)!.has(p.id)) return true;
          const pDataStr = normalizeText(`${p.collection} ${JSON.stringify(p.tags)}`);
          return pDataStr.includes(colNorm);
        });
        col.product_count = matchedProds.length;
      });

      setCollections(allCollections);
      setProducts(formattedProds);

      if (allCollections.length > 0 && !selectedCollection) {
        handleSelectCollection(allCollections[0], formattedProds);
      }
    } catch (err) {
      console.error("Error sincronizando colecciones con inventario:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!supabase) return;

    const channel = supabase
      .channel('realtime-collections-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_collections' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Focus rename input on edit start
  useEffect(() => {
    if (editingCollectionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingCollectionId]);

  const handleSelectCollection = async (collection: Collection, prodsList = products) => {
    setSelectedCollection(collection);
    setBulkMode(false);
    setBulkSelectedIds(new Set());
    const assignedIds = new Set<string>();
    const colNorm = normalizeText(collection.name);

    prodsList.forEach(p => {
      const pDataStr = normalizeText(`${p.collection} ${JSON.stringify(p.tags)}`);
      if (pDataStr.includes(colNorm)) assignedIds.add(p.id);
    });

    try {
      if (supabase && !collection.id.startsWith('tag-')) {
        const { data } = await supabase
          .from('product_collections')
          .select('product_id')
          .eq('collection_id', collection.id);
        data?.forEach((item: any) => assignedIds.add(String(item.product_id)));
      }
    } catch (err) {
      console.warn("Lectura relacional:", err);
    }

    setAssignedProductIds(assignedIds);
  };

  // ─── RENOMBRAR COLECCION ───
  const startRenaming = (col: Collection, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCollectionId(col.id);
    setEditingCollectionName(col.name);
  };

  const handleSaveRename = async () => {
    if (!editingCollectionId) return;
    const newName = editingCollectionName.trim().toUpperCase();
    const oldCol = collections.find(c => c.id === editingCollectionId);
    if (!newName || !oldCol || newName === oldCol.name) {
      setEditingCollectionId(null);
      return;
    }
    const oldName = oldCol.name;
    setCollections(prev => prev.map(c => c.id === editingCollectionId ? { ...c, name: newName } : c));
    if (selectedCollection?.id === editingCollectionId) {
      setSelectedCollection(prev => prev ? { ...prev, name: newName } : null);
    }
    setEditingCollectionId(null);
    try {
      if (supabase && !editingCollectionId.startsWith('tag-') && !editingCollectionId.startsWith('col-')) {
        await supabase.from('collections').update({ name: newName }).eq('id', editingCollectionId);
        const affectedProds = products.filter(p => {
          const arr = Array.isArray(p.tags) ? p.tags : typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()) : [];
          return arr.some(t => t.toUpperCase() === oldName);
        });
        for (const prod of affectedProds) {
          let arr = Array.isArray(prod.tags) ? [...prod.tags] : typeof prod.tags === 'string' ? prod.tags.split(',').map(t => t.trim()) : [];
          arr = arr.map(t => t.toUpperCase() === oldName ? newName : t);
          // await supabase.from('products').update({ tags: arr }).eq('id', prod.id);
        }
      }
    } catch (err) {
      console.error("Error renombrando coleccion:", err);
    }
  };

  // ─── BULK ACTIONS ───
  const toggleBulkProduct = (productId: string) => {
    setBulkSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const af = filteredProducts.filter(p => assignedProductIds.has(p.id));
    if (bulkSelectedIds.size === af.length && af.length > 0) setBulkSelectedIds(new Set());
    else setBulkSelectedIds(new Set(af.map(p => p.id)));
  };

  const handleBulkRemove = async () => {
    if (!selectedCollection || bulkSelectedIds.size === 0) return;
    if (!confirm(`Quitar ${bulkSelectedIds.size} producto(s) de "${selectedCollection.name}"?`)) return;
    const idsToRemove = Array.from(bulkSelectedIds);
    const newAssigned = new Set(assignedProductIds);
    idsToRemove.forEach(id => newAssigned.delete(id));
    setAssignedProductIds(newAssigned);
    setCollections(prev => prev.map(c => c.id === selectedCollection.id ? { ...c, product_count: newAssigned.size } : c));
    setBulkSelectedIds(new Set());
    setBulkMode(false);
    try {
      if (supabase) {
        if (!selectedCollection.id.startsWith('tag-') && !selectedCollection.id.startsWith('col-')) {
          for (const pid of idsToRemove) {
            await supabase.from('product_collections').delete().eq('collection_id', selectedCollection.id).eq('product_id', pid);
          }
        }
        for (const pid of idsToRemove) {
          const prod = products.find(p => p.id === pid);
          if (prod) {
            let arr = Array.isArray(prod.tags) ? [...prod.tags] : typeof prod.tags === 'string' ? prod.tags.split(',').map(t => t.trim()) : [];
            arr = arr.filter(t => t.toUpperCase() !== selectedCollection.name);
            prod.tags = arr;
            // await supabase.from('products').update({ tags: arr }).eq('id', pid);
          }
        }
      }
    } catch (err) { console.error("Error en bulk remove:", err); }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCollectionName.trim().toUpperCase();
    if (!cleanName) return;

    setIsCollectionCreating(true);

    const tempId = `col-${Date.now()}`;
    const newColObj: Collection = {
      id: tempId,
      name: cleanName,
      product_count: 0
    };

    setCollections(prev => [newColObj, ...prev]);
    setSelectedCollection(newColObj);
    setAssignedProductIds(new Set());
    setNewCollectionName("");

    try {
      if (supabase) {
        const { data } = await supabase
          .from('collections')
          .insert([{ name: cleanName }])
          .select()
          .maybeSingle();

        if (data) {
          const realCol: Collection = {
            id: String(data.id),
            name: String(data.name).toUpperCase(),
            product_count: 0
          };

          setCollections(prev => prev.map(c => c.id === tempId ? realCol : c));
          setSelectedCollection(realCol);
        }
      }
    } catch (err) {
      console.warn("Creación local activa:", err);
    } finally {
      setIsCollectionCreating(false);
    }
  };

  const handleDeleteCollection = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la colección "${name}"?`)) return;

    setCollections(prev => prev.filter(c => c.id !== id));

    if (selectedCollection?.id === id) {
      setSelectedCollection(null);
      setAssignedProductIds(new Set());
    }

    try {
      if (supabase && !id.startsWith('col-') && !id.startsWith('tag-')) {
        await supabase.from('collections').delete().eq('id', id);
      }
    } catch (err) {
      console.error("Error al eliminar en backend:", err);
    }
  };

  const toggleProductAssignment = async (productId: string) => {
    if (!selectedCollection) return;
    if (bulkMode) {
      if (assignedProductIds.has(productId)) toggleBulkProduct(productId);
      return;
    }
    const newAssigned = new Set(assignedProductIds);
    const isCurrentlyAssigned = newAssigned.has(productId);
    if (isCurrentlyAssigned) newAssigned.delete(productId); else newAssigned.add(productId);
    setAssignedProductIds(newAssigned);
    setCollections(prev => prev.map(c => c.id === selectedCollection.id ? { ...c, product_count: newAssigned.size } : c));
    try {
      if (supabase) {
        if (!selectedCollection.id.startsWith('tag-') && !selectedCollection.id.startsWith('col-')) {
          if (isCurrentlyAssigned) {
            await supabase.from('product_collections').delete().eq('collection_id', selectedCollection.id).eq('product_id', productId);
          } else {
            await supabase.from('product_collections').insert([{ collection_id: selectedCollection.id, product_id: productId }]);
          }
        }
        const prod = products.find(p => p.id === productId);
        if (prod) {
          let arr = Array.isArray(prod.tags) ? [...prod.tags] : typeof prod.tags === 'string' ? prod.tags.split(',').map(t => t.trim()) : [];
          if (isCurrentlyAssigned) arr = arr.filter(t => t.toUpperCase() !== selectedCollection.name);
          else if (!arr.some(t => t.toUpperCase() === selectedCollection.name)) arr.push(selectedCollection.name);
          prod.tags = arr;
          // await supabase.from('products').update({ tags: arr }).eq('id', productId);
        }
      }
    } catch (err) { console.warn("Sincronizacion realizada:", err); }
  };

  const filteredProducts = products.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = normalizeText(searchTerm);
    return normalizeText(p.name).includes(term) || normalizeText(p.category).includes(term);
  });

  const assignedFiltered = filteredProducts.filter(p => assignedProductIds.has(p.id));
  const unassignedFiltered = filteredProducts.filter(p => !assignedProductIds.has(p.id));

  return (
    <div className="w-full min-h-screen bg-[#060c17] text-white p-4 md:p-8 flex flex-col gap-6">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-black tracking-widest text-yellow-400 uppercase flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> MERCHANDISING ENGINE
          </span>
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white mt-1">
            GESTOR DE COLECCIONES E INVENTARIO
          </h1>
          <p className="text-gray-400 text-xs md:text-sm font-light mt-0.5">
            Colecciones y etiquetas del Inventario en tiempo real.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="self-start md:self-auto bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sincronizar
        </button>
      </div>

      {/* CREAR COLECCIÓN / ETIQUETA */}
      <form onSubmit={handleCreateCollection} className="flex gap-3 max-w-xl bg-[#0a1628] p-2 rounded-2xl border border-white/10 shadow-xl">
        <input
          type="text"
          placeholder="NOMBRE DE LA NUEVA COLECCIÓN O ETIQUETA..."
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          className="flex-1 bg-transparent px-4 text-xs font-bold text-white placeholder-gray-500 focus:outline-none uppercase"
        />
        <button
          type="submit"
          disabled={isCreating || !newCollectionName.trim()}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Crear Colección
        </button>
      </form>

      {/* GRID DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: LISTA DE COLECCIONES Y ETIQUETAS */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-yellow-400" /> Colecciones y Etiquetas ({collections.length})
          </h2>

          {collections.length === 0 ? (
            <div className="p-10 text-center bg-[#0a1628]/50 rounded-2xl border border-white/5 text-gray-500 text-xs font-bold uppercase tracking-wider">
              No hay colecciones creadas.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[640px] overflow-y-auto pr-1">
              {collections.map((col) => {
                const isSelected = selectedCollection?.id === col.id;
                const isEditing = editingCollectionId === col.id;

                return (
                  <div
                    key={col.id}
                    onClick={() => !isEditing && handleSelectCollection(col)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? "bg-[#0d1f38] border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.15)]"
                        : "bg-[#0a1628]/80 hover:bg-[#0a1628] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${isSelected ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        <FolderPlus className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            ref={renameInputRef}
                            value={editingCollectionName}
                            onChange={e => setEditingCollectionName(e.target.value.toUpperCase())}
                            onBlur={handleSaveRename}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); handleSaveRename(); }
                              if (e.key === 'Escape') setEditingCollectionId(null);
                            }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#1a3060] border border-yellow-400/50 rounded-lg px-2 py-1 text-sm font-black text-white uppercase focus:outline-none focus:border-yellow-400 w-full"
                          />
                        ) : (
                          <h3 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-yellow-400 transition-colors truncate">
                            {col.name}
                          </h3>
                        )}
                        <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
                          {col.product_count} ITEM{col.product_count === 1 ? '' : 'S'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={(e) => startRenaming(col, e)}
                        className="p-1.5 text-gray-600 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all"
                        title="Renombrar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelectCollection(col); }}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-0.5 transition-all ${
                          isSelected ? "bg-yellow-400 text-black" : "text-gray-400 group-hover:text-white bg-white/5"
                        }`}
                      >
                        Ver <ChevronRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id, col.name); }}
                        className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Eliminar coleccion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: SELECCIÓN DE PRODUCTOS */}
        <div className="lg:col-span-7 bg-[#0a1628] border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col gap-4 shadow-2xl min-h-[420px]">
          {selectedCollection ? (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-yellow-400 tracking-widest flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Coleccion activa
                  </span>
                  <h2 className="text-xl font-black uppercase text-white tracking-tight">{selectedCollection.name}</h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {assignedProductIds.size} asignado(s) &middot; {products.length - assignedProductIds.size} sin asignar
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setBulkMode(b => !b); setBulkSelectedIds(new Set()); }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border ${
                      bulkMode ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <CheckSquare className="w-3 h-3" />
                    {bulkMode ? 'Cancelar' : 'Seleccion'}
                  </button>
                  <div className="relative w-40">
                    <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="BUSCAR..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#030c1a] border border-white/10 rounded-xl pl-7 pr-6 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 uppercase"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bulk action bar */}
              {bulkMode && (
                <div className="flex items-center justify-between bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-4 py-2.5 gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-[10px] font-black uppercase text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      {bulkSelectedIds.size === assignedFiltered.length && assignedFiltered.length > 0
                        ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />
                      }
                      {bulkSelectedIds.size === assignedFiltered.length && assignedFiltered.length > 0
                        ? 'Deseleccionar todo' : 'Seleccionar todo'
                      }
                    </button>
                    {bulkSelectedIds.size > 0 && (
                      <span className="text-[10px] text-gray-400 font-bold">{bulkSelectedIds.size} seleccionado(s)</span>
                    )}
                  </div>
                  <button
                    onClick={handleBulkRemove}
                    disabled={bulkSelectedIds.size === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <AlertTriangle className="w-3 h-3" /> Quitar de coleccion
                  </button>
                </div>
              )}

              {/* Productos asignados */}
              {assignedFiltered.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-yellow-400/20" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400/80 px-2 whitespace-nowrap">En esta coleccion ({assignedFiltered.length})</span>
                    <div className="h-px flex-1 bg-yellow-400/20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {assignedFiltered.map((prod) => {
                      const isBulkSelected = bulkSelectedIds.has(prod.id);
                      return (
                        <div
                          key={prod.id}
                          onClick={() => bulkMode ? toggleBulkProduct(prod.id) : toggleProductAssignment(prod.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group ${
                            bulkMode && isBulkSelected ? "bg-yellow-400/10 border-yellow-400" : "bg-[#0e2744] border-yellow-400/50 hover:border-yellow-400 shadow-sm"
                          }`}
                        >
                          {bulkMode && (
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isBulkSelected ? 'bg-yellow-400 border-yellow-400' : 'border-white/30'
                            }`}>
                              {isBulkSelected && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                            </div>
                          )}
                          <div className="w-10 h-10 bg-[#0a1628] rounded-xl border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1">
                            {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-contain" /> : <Package className="w-4 h-4 text-gray-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-yellow-300 transition-colors">{prod.name}</h4>
                            <span className="text-[10px] font-extrabold text-yellow-400">{prod.price.toFixed(2)}EUR</span>
                          </div>
                          {!bulkMode && <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-black stroke-[3]" /></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Productos sin asignar */}
              {unassignedFiltered.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 px-2 whitespace-nowrap">Sin asignar ({unassignedFiltered.length})</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {unassignedFiltered.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => !bulkMode && toggleProductAssignment(prod.id)}
                        className={`p-3 rounded-2xl border transition-all flex items-center gap-3 group opacity-50 hover:opacity-100 ${
                          bulkMode ? 'cursor-default' : 'cursor-pointer'
                        } bg-[#030c1a]/60 border-white/5 hover:border-white/20`}
                      >
                        <div className="w-10 h-10 bg-[#0a1628] rounded-xl border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-contain" /> : <Package className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-yellow-300 transition-colors">{prod.name}</h4>
                          <span className="text-[10px] font-extrabold text-yellow-400">{prod.price.toFixed(2)}EUR</span>
                        </div>
                        {!bulkMode && (
                          <div className="w-5 h-5 rounded-full border border-white/20 group-hover:border-white/50 shrink-0 flex items-center justify-center">
                            <Plus className="w-3 h-3 text-white/30 group-hover:text-white/80 transition-colors" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredProducts.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-center text-gray-500">
                  <Package className="w-10 h-10 mb-2 opacity-20" />
                  <p className="font-bold text-xs uppercase tracking-widest max-w-xs">
                    {searchTerm ? `Sin resultados para "${searchTerm}"` : "No hay productos registrados en el inventario"}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center text-gray-500">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-bold text-xs uppercase tracking-widest max-w-xs">
                SELECCIONA UNA COLECCION DE LA IZQUIERDA PARA GESTIONARLE SUS PRODUCTOS
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}