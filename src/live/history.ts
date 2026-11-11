import type { Movement, Profile } from './client';

export type ContributorDirectory = Record<string,Record<string,string>>;
export function historyForSpace(movements:Movement[],userId:string,scope:string) {
  return movements.filter(m=>scope==='all'||(scope?m.group_id===scope:m.user_id===userId&&!m.group_id));
}
export function contributorName(movement:Pick<Movement,'user_id'|'group_id'>,profile:Pick<Profile,'id'|'display_name'>,directory:ContributorDirectory,loading=false) {
  if(movement.user_id===profile.id)return profile.display_name.trim()?`${profile.display_name.trim()} (tú)`:'Tú';
  const name=movement.group_id?directory[movement.group_id]?.[movement.user_id]?.trim():undefined;
  return name||(loading?'Cargando integrante…':'Integrante no disponible');
}
export function canUndoMovement(movement:Pick<Movement,'user_id'|'reversed_at'>,userId:string) {
  return movement.user_id===userId&&!movement.reversed_at;
}
export function contributionTotals(movements:Movement[]) {
  const seen=new Set<string>();
  const totals=new Map<string,{key:string;user_id:string;group_id:string;total:number;count:number}>();
  for(const m of movements) {
    if(seen.has(m.id)||m.type!=='savings'||!m.group_id||m.reversed_at||!Number.isFinite(m.amount)||m.amount<=0)continue;
    seen.add(m.id);
    const key=`${m.group_id}:${m.user_id}`,previous=totals.get(key);
    totals.set(key,{key,user_id:m.user_id,group_id:m.group_id,total:(previous?.total||0)+Math.round(m.amount*100),count:(previous?.count||0)+1});
  }
  return [...totals.values()].map(row=>({...row,total:row.total/100}));
}
