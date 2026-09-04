import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Package, Tag, Hash, Euro, 
  Database, Activity, Loader2, AlertCircle, Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageUploader } from './ImageUploader';
import { BulkImageUploader } from './BulkImageUploader';
import { useTaxonomyStore } from '../../lib/taxonomyStore';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: any;
  languageCounts?: Record<string, number>;
}

export const ProductFormModal = ({ isOpen, onClose, onSuccess, product }: ProductFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    base_price: 0,
    base_stock: 0,
    status: 'draft' as 'active' | 'draft' | 'archived',
    image_url: '',
    game_id: '',
    category_id: '',
    expansion_id: '',
    tags: [] as string[],
    top_hits_images: [] as string[],
    language: '',
    description: '',
    content: ''
  });

  const { games, categories, expansions, fetchTaxonomy } = useTaxonomyStore();
  const [availableTags, setAvailableTags] = useState<{id: string, name: string}[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTaxonomy();
      fetchAvailableTags();
      if (product) {
        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          base_price: product.base_price || product.price || 0,
          base_stock: product.base_stock || product.stock || 0,
          status: product.status || 'draft',
          image_url: product.image_url || product.main_image || '',
          game_id: product.game_id || '',
          category_id: product.category_id || '',
          expansion_id: product.expansion_id || '',
          tags: [], 
          top_hits_images: product.top_hits_images || [],
          language: product.language || '',
          description: product.description || '',
          content: product.content || ''
        });
        fetchProductTags(product.id);
      } else {
        setFormData({
          name: '',
          sku: '',
          base_price: 0,
          base_stock: 0,
          status: 'draft',
          image_url: '',
          game_id: '',
          category_id: '',
          expansion_id: '',
          tags: [],
          top_hits_images: [],
          language: '',
          description: '',
          content: ''
        });
      }
    }
    setError(null);
  }, [isOpen, product]);

  const fetchAvailableTags = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('collections').select('id, name');
      if (data) {
        setAvailableTags(data.map((c: any) => ({ id: String(c.id), name: String(c.name).toUpperCase() })));
      }
    } catch (e) {
      console.warn("Aviso cargando etiquetas:", e);
    }
  };

  const fetchProductTags = async (productId: string) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('product_collections')
        .select('collections(name)')
        .eq('product_id', productId);
      
      let tagNames: string[] = [];
      if (data) {
        tagNames = data.map((item: any) => item.collections?.name).filter(Boolean);
      }

      if (tagNames.length === 0 && product?.tags) {
        if (Array.isArray(product.tags)) tagNames = product.tags;
        else if (typeof product.tags === 'string') tagNames = product.tags.split(',').map((t: string) => t.trim());
      }

      setFormData(prev => ({ ...prev, tags: tagNames.map((t: string) => t.toUpperCase()) }));
    } catch (err) {
      console.warn("Aviso al cargar tags del producto:", err);
    }
  };

  const handleAddTag = async (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    
    const tag = tagInput.trim().toUpperCase();
    if (!tag || formData.tags.includes(tag)) return;

    setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput('');

    const existsInDB = availableTags.some(t => t.name === tag);
    if (!existsInDB && supabase) {
      setCreatingTag(true);
      try {
        const { data: newCol } = await supabase
          .from('collections')
          .insert([{ name: tag }])
          .select('id, name')
          .maybeSingle();

        if (newCol?.id) {
          setAvailableTags(prev => [
            { id: String(newCol.id), name: String(newCol.name).toUpperCase() },
            ...prev
          ]);
        }
      } catch (_) {
        try {
          const { data: existingCol } = await supabase
            .from('collections')
            .select('id, name')
            .eq('name', tag)
            .maybeSingle();
          if (existingCol?.id && !availableTags.some(t => t.id === String(existingCol.id))) {
            setAvailableTags(prev => [
              { id: String(existingCol.id), name: String(existingCol.name).toUpperCase() },
              ...prev
            ]);
          }
        } catch (_) {}
      } finally {
        setCreatingTag(false);
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!supabase) throw new Error("Conexión con Supabase no disponible");

      const payload: any = {
        name: formData.name,
        sku: formData.sku || null,
        base_price: formData.base_price || 0,
        base_stock: formData.base_stock || 0,
        status: formData.status,
        image_url: formData.image_url || null,
        game_id: formData.game_id || null,
        expansion_id: formData.expansion_id || null,
        language: formData.language || null,
        description: formData.description || null,
        content: formData.content || null
      };

      if (formData.category_id) {
        payload.category_id = formData.category_id;
      }

      let result;
      if (product?.id) {
        result = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)
          .select();
      } else {
        result = await supabase
          .from('products')
          .insert([payload])
          .select();
      }

      if (result.error) {
        console.error("Error directo de Supabase:", result.error);
        throw new Error(result.error.message || result.error.details || "Error al actualizar producto");
      }

      const finalProductId = product?.id || result.data?.[0]?.id;

      if (finalProductId) {
        try {
          await supabase.from('product_collections').delete().eq('product_id', finalProductId);
        } catch (e) {
          console.warn("Limpieza relacional:", e);
        }
        
        for (const rawTag of formData.tags) {
          const cleanTag = rawTag.trim().toUpperCase();
          if (!cleanTag) continue;

          let collectionId: string | null = null;
          const { data: existingCol } = await supabase
            .from('collections')
            .select('id')
            .eq('name', cleanTag)
            .maybeSingle();

          if (existingCol?.id) {
            collectionId = String(existingCol.id);
          } else {
            const { data: newCol } = await supabase
              .from('collections')
              .insert([{ name: cleanTag }])
              .select('id')
              .maybeSingle();

            if (newCol?.id) {
              collectionId = String(newCol.id);
            }
          }

          if (collectionId) {
            try {
              await supabase
                .from('product_collections')
                .insert([{ product_id: finalProductId, collection_id: collectionId }]);
            } catch (e) {
              console.error("Exception inserting into product_collections:", e);
            }
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al guardar el producto:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-xl bg-background border-l border-border z-[101] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground uppercase tracking-tight">
                    {product ? 'Editar Producto' : 'Nuevo Producto'}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Gestión de Inventario Enterprise</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar text-foreground">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* General Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                  <Activity className="w-3 h-3" /> Información General
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Nombre del Producto</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ej: Charizard VMAX Gold"
                        className="w-full bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-sm text-foreground focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">SKU / Referencia</label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          type="text" 
                          value={formData.sku}
                          onChange={(e) => setFormData({...formData, sku: e.target.value})}
                          placeholder="SKU-001"
                          className="w-full bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-sm text-foreground font-mono focus:outline-none focus:border-red-500/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Estado</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        className="w-full bg-input border border-border rounded-2xl px-4 py-4 text-sm text-foreground focus:outline-none focus:border-red-500/50 transition-all appearance-none"
                      >
                        <option value="draft">Borrador</option>
                        <option value="active">Activo</option>
                        <option value="coming_soon">Próximamente</option>
                        <option value="archived">Archivado</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Idioma</label>
                      <select 
                        value={formData.language}
                        onChange={(e) => setFormData({...formData, language: e.target.value})}
                        className="w-full bg-input border border-border rounded-2xl px-4 py-4 text-sm text-foreground focus:outline-none focus:border-red-500/50 transition-all appearance-none"
                      >
                        <option value="">Sin Idioma (Accesorios)</option>
                        <option value="Español">Español (ES)</option>
                        <option value="Inglés">Inglés (GB)</option>
                        <option value="Japonés">Japonés (JP)</option>
                        <option value="Coreano">Coreano (KR)</option>
                        <option value="Chino">Chino (CN)</option>
                        <option value="Multilenguaje">Multilenguaje</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Franquicia (Juego)</label>
                      <div className="relative">
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <select 
                          value={formData.game_id}
                          onChange={(e) => setFormData({...formData, game_id: e.target.value, category_id: '', expansion_id: ''})}
                          className="w-full bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-sm text-foreground focus:outline-none focus:border-red-500/50 transition-all appearance-none"
                        >
                          <option value="">Selecciona Franquicia</option>
                          {games.map(game => (
                            <option key={game.id} value={game.id}>{game.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Categoría</label>
                      <div className="relative">
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <select 
                          value={formData.category_id}
                          onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                          disabled={!formData.game_id}
                          className="w-full bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-sm text-foreground focus:outline-none focus:border-red-500/50 transition-all appearance-none disabled:opacity-50"
                        >
                          <option value="">Selecciona Categoría</option>
                          {categories.filter(c => c.game_id === formData.game_id).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Expansión / Set</label>
                      <div className="relative">
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <select 
                          value={formData.expansion_id}
                          onChange={(e) => setFormData({...formData, expansion_id: e.target.value})}
                          disabled={!formData.game_id}
                          className="w-full bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-sm text-foreground focus:outline-none focus:border-red-500/50 transition-all appearance-none disabled:opacity-50"
                        >
                          <option value="">Selecciona Expansión</option>
                          {expansions.filter(e => e.game_id === formData.game_id).map(exp => (
                            <option key={exp.id} value={exp.id}>{exp.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* DESCRIPCIÓN DEL PRODUCTO */}
                  <div className="flex flex-col gap-1.5 md:col-span-3 mt-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                      Descripción del Producto (Texto al girar la carta)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Escribe aquí los detalles del producto que el cliente verá en el reverso..."
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-[#030c1a] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  {/* CONTENIDO DEL PRODUCTO */}
                  <div className="flex flex-col gap-1.5 md:col-span-3 mt-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                      Contenido del Producto (Ej: 10 Sobres, 1 Carta Promo, Dados...)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Especifica exactamente qué incluye este paquete, caja o sobre..."
                      value={formData.content || ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full bg-[#030c1a] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                  <Database className="w-3 h-3" /> Valores y Stock
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Precio Base (€)</label>
                    <div className="relative">
                      <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.base_price}
                        onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value) || 0})}
                        className="w-full bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-sm text-foreground font-mono focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Stock Inicial</label>
                    <div className="relative">
                      <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="number" 
                        value={formData.base_stock}
                        onChange={(e) => setFormData({...formData, base_stock: parseInt(e.target.value) || 0})}
                        className="w-full bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-sm text-foreground font-mono focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                  <Activity className="w-3 h-3" /> Media Assets
                </div>
                
                <div className="bg-card border border-border p-6 rounded-[2rem] space-y-8">
                  <ImageUploader 
                    label="Imagen Principal (Thumbnail)"
                    currentUrl={formData.image_url}
                    onUploadSuccess={(url) => setFormData({...formData, image_url: url})}
                  />
                  
                  <div className="h-[1px] bg-border w-full" />
                  
                  <BulkImageUploader 
                    label="Top Hits — Galería de Cartas"
                    productId={product?.id}
                    currentUrls={formData.top_hits_images}
                    onUploadSuccess={(urls) => setFormData({...formData, top_hits_images: urls})}
                  />
                </div>
              </div>

              {/* Tags / Collections Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                  <Tag className="w-3 h-3" /> Categorización y Etiquetas
                  {creatingTag && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-[9px]">Creando colección...</span>
                    </span>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Etiquetas / Colecciones del Producto</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Escribe y pulsa Enter para añadir..."
                        className="w-full bg-input border border-border rounded-2xl pl-12 pr-16 py-4 text-sm text-foreground focus:outline-none focus:border-red-500/50 transition-all uppercase"
                      />
                      <button 
                        type="button"
                        onClick={() => handleAddTag()}
                        disabled={creatingTag}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-500 uppercase hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>

                  {/* Tags activos */}
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => {
                      const isInDB = availableTags.some(t => t.name === tag);
                      return (
                        <span 
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-500 uppercase tracking-wider group hover:bg-red-600 hover:text-white transition-all cursor-default"
                        >
                          {tag}
                          {!isInDB && <span className="text-[8px] opacity-60 font-normal normal-case">nuevo</span>}
                          <button 
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:scale-125 transition-transform"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    {formData.tags.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic ml-1">Sin etiquetas asignadas. Escribe arriba para añadir.</p>
                    )}
                  </div>

                  {/* Sugerencias desde BD (todas las colecciones) */}
                  {availableTags.filter(t => !formData.tags.includes(t.name)).length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 ml-1">Colecciones existentes:</p>
                      <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                        {availableTags
                          .filter(t => !formData.tags.includes(t.name))
                          .map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, tags: [...prev.tags, tag.name] }))}
                              className="px-2.5 py-1 bg-muted/50 border border-border rounded-lg text-[9px] font-bold text-muted-foreground hover:border-red-500 hover:text-red-500 uppercase transition-all shrink-0"
                            >
                              + {tag.name}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-8 border-t border-border bg-muted/30 flex gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-input border border-border rounded-2xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] px-6 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-900/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {product ? 'Actualizar Producto' : 'Crear Producto'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};