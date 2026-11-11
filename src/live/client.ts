import { createClient } from '@supabase/supabase-js';

// Configuración pública; RLS y la sesión del usuario protegen los datos.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://ahnfwlmymthfgxpyoasz.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_94DMzectGQjIV8bIE7-fEQ_EhUY0xko';
export const database = url && key ? createClient(url, key) : null;
export const requireDatabase = () => {
  if (!database) throw new Error('Falta configurar la conexión con Supabase.');
  return database;
};

export interface Goal {
  id: string; title: string; owner_id: string; group_id: string | null;
  target_amount: number; target_date: string; current_amount: number;
}
export interface Movement {
  id: string; user_id: string; type: 'expense' | 'income' | 'savings'; amount: number;
  category: string; description: string; occurred_on: string; source: 'voice' | 'text' | 'manual';
  goal_id: string | null; group_id: string | null; reversed_at: string | null;
}
export interface Preferences {
  weeklyBudget: number; highContrast: boolean; largeText: boolean; reducedMotion: boolean;
  simple: boolean; audio: boolean;
}
export interface Profile {
  id: string; display_name: string; preferences: Partial<Preferences>;
  learned_categories: Record<string, { category: string; count: number }>;
}
export interface Group { id: string; name: string; }
export interface Member { user_id: string; name: string; role: string; }
export interface Request { id: string; name: string; status: string; }
export interface Invitation { id: string; group_id: string; code: string; expires_at: string; revoked_at: string | null; }
export interface Snapshot {
  groups: Group[]; goals: Goal[]; movements: Movement[]; roles: Record<string,string>;
  invitations: Invitation[]; requests: Request[];
}
export const emptySnapshot: Snapshot = { groups: [], goals: [], movements: [], roles: {}, invitations: [], requests: [] };
export async function rpc<T>(name: string, parameters: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await requireDatabase().rpc(name, parameters);
  if (error) throw new Error(error.message);
  return data as T;
}
export async function loadSnapshot(userId: string): Promise<Snapshot> {
  const db = requireDatabase();
  const results = await Promise.all([
    db.from('groups').select('*').order('created_at'),
    db.from('goal_progress').select('*').order('created_at'),
    db.from('movements').select('*').order('created_at',{ascending:false}),
    db.from('group_members').select('group_id,role').eq('user_id',userId),
    db.from('group_invitations').select('*').is('revoked_at',null).order('created_at',{ascending:false}),
  ]);
  for (const result of results) if (result.error) throw new Error(result.error.message);
  return {
    groups: results[0].data || [],
    goals: (results[1].data || []).map(g=>({...g, target_amount:Number(g.target_amount),current_amount:Number(g.current_amount)})),
    movements: (results[2].data || []).map(m=>({...m,amount:Number(m.amount)})),
    roles: Object.fromEntries((results[3].data || []).map(m=>[m.group_id,m.role])),
    invitations: results[4].data || [], requests: await rpc<Request[]>('my_requests'),
  };
}
