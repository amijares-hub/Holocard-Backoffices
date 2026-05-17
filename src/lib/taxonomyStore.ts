import { create } from 'zustand';
import { supabase } from './supabase';

export interface Game {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  game_id: string;
  name: string;
  slug: string;
}

export interface Expansion {
  id: string;
  game_id: string;
  name: string;
  slug: string;
}

interface TaxonomyState {
  games: Game[];
  categories: Category[];
  expansions: Expansion[];
  loading: boolean;
  error: string | null;
  fetchTaxonomy: () => Promise<void>;
}

export const useTaxonomyStore = create<TaxonomyState>((set) => ({
  games: [],
  categories: [],
  expansions: [],
  loading: false,
  error: null,
  fetchTaxonomy: async () => {
    set({ loading: true, error: null });
    try {
      const [gamesRes, categoriesRes, expansionsRes] = await Promise.all([
        supabase.from('games').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('expansions').select('*').order('name')
      ]);

      if (gamesRes.error) throw gamesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (expansionsRes.error) throw expansionsRes.error;

      console.log('Taxonomy fetched successfully:', {
        games: gamesRes.data,
        categories: categoriesRes.data,
        expansions: expansionsRes.data
      });

      set({
        games: gamesRes.data as Game[],
        categories: categoriesRes.data as Category[],
        expansions: expansionsRes.data as Expansion[],
        loading: false
      });
    } catch (err: any) {
      console.error('Error fetching taxonomy details:', err);
      set({ error: err.message, loading: false });
    }
  }
}));
