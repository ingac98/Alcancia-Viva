import React, { useEffect, useState } from 'react';
import { rpc } from './client';
import type { Member, Profile, Snapshot } from './client';
import { soles } from './domain';
import { canUndoMovement, contributorName, contributionTotals, historyForSpace } from './history';
import type { ContributorDirectory } from './history';
import './history.css';

const movementNames={expense:'Gasto',income:'Ingreso',savings:'Ahorro'};
export function MovementHistory({snapshot,profile,scope,busy,onUndo}:{snapshot:Snapshot;profile:Profile;scope:string;busy:boolean;onUndo:(id:string)=>Promise<void>}) {
  const [directory,setDirectory]=useState<ContributorDirectory>({});
  const [loading,setLoading]=useState(true),[namesUnavailable,setNamesUnavailable]=useState(false);
  const movements=historyForSpace(snapshot.movements,profile.id,scope);
  const group=snapshot.groups.find(g=>g.id===scope),overview=scope==='all';
  useEffect(()=>{
    let alive=true;
    const relevant=historyForSpace(snapshot.movements,profile.id,scope);
    const allowedGroups=new Set(snapshot.groups.map(g=>g.id));
    const groupIds=[...new Set(relevant.map(m=>m.group_id).filter((id):id is string=>typeof id==='string'&&allowedGroups.has(id)))];
    setLoading(groupIds.length>0);setNamesUnavailable(false);
    setDirectory(previous=>Object.fromEntries(groupIds.map(id=>[id,previous[id]||{}])));
    Promise.allSettled(groupIds.map(async groupId=>({groupId,people:await rpc<{members:Member[]}>('group_people',{p_group:groupId})}))).then(results=>{
      if(!alive)return;
      const next:ContributorDirectory={};
      for(const result of results)if(result.status==='fulfilled')next[result.value.groupId]=Object.fromEntries((result.value.people.members||[]).map(member=>[member.user_id,member.name]));
      setDirectory(next);setNamesUnavailable(results.some(result=>result.status==='rejected'));setLoading(false);
    });
    return()=>{alive=false;};
  },[snapshot,scope,profile.id]);
  const totals=contributionTotals(movements);
  const groupName=(id:string)=>snapshot.groups.find(g=>g.id===id)?.name||'Grupo compartido';
  return <section className="av-history" aria-label="Historial de movimientos">
    <h1>{group?'Aportes del grupo':overview?'Movimientos de tus espacios':'Mis movimientos'}</h1>
    <p>{group?'Consulta quién aportó, cuánto y a qué meta.':'Consulta tus registros y los aportes de tus grupos.'} Los movimientos revertidos se conservan en el historial.</p>
    {namesUnavailable&&<p className="av-notice" role="status">No pudimos cargar algunos nombres. Los importes del historial se mantienen visibles; vuelve a abrir Movimientos para reintentar.</p>}
    {(group||overview)&&totals.length>0&&<section className="av-card av-contribution-summary" aria-labelledby="av-contribution-summary-title">
      <h2 id="av-contribution-summary-title">{overview?'Aportes por integrante y grupo':'Aportes por integrante'}</h2><p>Totales vigentes: no incluyen movimientos revertidos.</p>
      <dl>{totals.map(row=><div key={row.key}><dt><strong>{contributorName(row,profile,directory,loading)}</strong>{overview&&<span>{groupName(row.group_id)}</span>}</dt><dd><strong>{soles(row.total)}</strong><span>{row.count} aporte{row.count===1?'':'s'} vigente{row.count===1?'':'s'}</span></dd></div>)}</dl>
    </section>}
    {movements.map(m=><article className={`av-card av-movement ${m.reversed_at?'av-movement-reversed':''}`} key={m.id}>
      <div><h2>{movementNames[m.type]} · {soles(m.amount)}</h2>
        <p className="av-movement-author">{m.type==='savings'?'Aportó':'Registrado por'}: <strong>{contributorName(m,profile,directory,loading)}</strong></p>
        {overview&&m.group_id&&<p>Grupo: {groupName(m.group_id)}</p>}
        <p>{m.description||m.category} · {m.occurred_on}</p>
        <p>{m.goal_id?`Meta: ${snapshot.goals.find(g=>g.id===m.goal_id)?.title||'Meta registrada'}`:`Categoría: ${m.category}`}</p>
        {m.reversed_at&&<p className="av-reversed-badge"><strong>Revertido</strong> · No se suma al total vigente.</p>}
      </div>
      {canUndoMovement(m,profile.id)&&<button className="av-secondary" disabled={busy} onClick={()=>onUndo(m.id)}>Deshacer</button>}
    </article>)}
    {!movements.length&&<p>Aún no hay movimientos en este espacio.</p>}
  </section>;
}
