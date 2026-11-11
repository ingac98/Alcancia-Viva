import React, { useEffect, useState } from 'react';
import type { Goal, Group, Preferences } from './client';
import { soles } from './domain';
import { GROWTH_STAGES, gardenNumber, goalPercent, growthStage, gardenSummary, goalPace, goalDateLabel } from './garden';
import { SpeechService } from '../services/voice/speechService';
import './garden.css';

function Plant({percent,index=0}:{percent:number;index?:number}) {
  const stage=growthStage(percent);
  const style={'--ag-position':`${[0,50,100][stage%3]}% ${stage<3?0:100}%`,'--ag-delay':`${index*-.85}s`} as React.CSSProperties;
  return <span className="ag-plant" aria-hidden="true"><span className={`ag-stage ${stage<3?'ag-top-row':''}`} style={style}><span className="ag-vessel"/><span className="ag-foliage"/></span></span>;
}
const groupLabel=(goal:Goal,groups:Group[])=>goal.group_id?`Grupo · ${groups.find(group=>group.id===goal.group_id)?.name||'Compartido'}`:'Personal';
interface GardenProps {
  goals:Goal[]; groups:Group[]; selectedId:string; today:string; prefs:Preferences;
  onSelect:(id:string)=>void; onContribute:(goal:Goal)=>void; onCreate:()=>void;
  watering:{goalId:string;nonce:number}|null;
}
export function Garden({goals,groups,selectedId,today,prefs,onSelect,onContribute,onCreate,watering}:GardenProps) {
  const [paused,setPaused]=useState(false),[systemReduced,setSystemReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setSystemReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  const selected=goals.find(goal=>goal.id===selectedId)||goals[0];
  const summary=gardenSummary(goals),value=selected?goalPercent(selected):0;
  const stage=GROWTH_STAGES[growthStage(value)],rhythm=selected?goalPace(selected,today):null;
  const page=Math.max(0,Math.floor(goals.findIndex(goal=>goal.id===selected?.id)/8));
  const visible=goals.slice(page*8,page*8+8);
  const reduced=prefs.reducedMotion||systemReduced,stopped=paused||reduced;
  function speakGarden(){
    const text=`${summary.label}. ${summary.count} metas con un avance promedio de ${gardenNumber(summary.percent)} por ciento. ${selected?`${selected.title}: ${soles(selected.current_amount)} de ${soles(selected.target_amount)}. ${stage.name}. ${rhythm?.label}. ${rhythm?.message}`:'Crea tu primera meta para plantar una nueva maceta.'}`;
    SpeechService.speak(text);
  }
  return <section className={`av-garden-live ${stopped?'ag-paused':''}`} aria-label="Jardín de tus metas">
    <div className="ag-intro"><div><p className="ag-eyebrow">UN ESPACIO PARA VERTE CRECER</p><h1>Cada meta, una nueva raíz.</h1><p>Elige una maceta y descubre la historia de su crecimiento.</p></div><div className="ag-controls">
      <button className="av-secondary" onClick={()=>setPaused(!paused)} aria-pressed={stopped} disabled={reduced}>{reduced?'Movimiento reducido':paused?'Reanudar movimiento':'Pausar movimiento'}</button>
      <button className="av-secondary" onClick={speakGarden} disabled={!SpeechService.isSynthesisSupported()}>Escuchar jardín</button>
    </div></div>
    <div className="ag-layout"><div className="ag-garden-column">
      <div className="ag-scene" style={{'--ag-saturation':.85+summary.percent*.003} as React.CSSProperties}>
        <div className="ag-scene-heading"><span>EL JARDÍN DE TUS METAS</span><p>{summary.label}</p></div>
        <div className="ag-pots" role="group" aria-label="Macetas de tus metas">
          {visible.map((goal,index)=>{const amount=goalPercent(goal),phase=GROWTH_STAGES[growthStage(amount)];return <button type="button" className="ag-pot" key={goal.id} data-goal={goal.id} aria-pressed={goal.id===selected?.id} aria-controls="av-garden-detail" aria-label={`${goal.title}. ${groupLabel(goal,groups)}. ${gardenNumber(amount)} por ciento. ${phase.name}. Ver estado.`} onClick={()=>onSelect(goal.id)}>
            <Plant percent={amount} index={index}/><span className="ag-plant-label"><strong>{goal.title}</strong><small>{groupLabel(goal,groups)}</small><b>{gardenNumber(amount)} %</b></span>
            {watering?.goalId===goal.id&&!stopped&&<span key={watering.nonce} className="ag-watering" aria-hidden="true">{[0,1,2,3,4,5].map(i=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</span>}
          </button>;})}
          {!goals.length&&<div className="ag-empty"><p>Aquí crecerá tu próxima meta.</p><button onClick={onCreate}>Plantar mi primera meta</button></div>}
        </div>
        <div className="ag-scene-foot"><span>Cada maceta representa una meta</span><span>{goals.length>8?`${page*8+1}–${Math.min((page+1)*8,goals.length)} de ${goals.length}`:`${goals.length} maceta${goals.length===1?'':'s'}`}</span></div>
      </div>
      {goals.length>8&&<div className="ag-pages"><button className="av-secondary" disabled={page===0} onClick={()=>onSelect(goals[(page-1)*8].id)}>Anteriores</button><span>Página {page+1} de {Math.ceil(goals.length/8)}</span><button className="av-secondary" disabled={(page+1)*8>=goals.length} onClick={()=>onSelect(goals[(page+1)*8].id)}>Siguientes</button></div>}
      <div className="ag-summary"><div className="ag-average" style={{'--ag-average':`${summary.percent}%`} as React.CSSProperties}><strong>{gardenNumber(summary.percent)} %</strong></div><div><h2>Tu jardín, en conjunto</h2><p>Promedio de {summary.count} meta{summary.count===1?'':'s'} de este espacio. Cada una tiene el mismo peso.</p></div><span className="ag-achievement">{summary.completed} meta{summary.completed===1?'':'s'} florecida{summary.completed===1?'':'s'}</span></div>
      <div className="ag-add"><button className="av-secondary" onClick={onCreate}>＋ Crear una meta</button></div>
    </div>
    {selected&&rhythm&&<aside id="av-garden-detail" className="ag-detail" aria-labelledby="av-garden-goal-title">
      <div className="ag-detail-top"><span className="ag-eyebrow">TU MACETA SELECCIONADA</span><span className="ag-type">{groupLabel(selected,groups)}</span></div>
      <h2 id="av-garden-goal-title">{selected.title}</h2><p className="ag-stage-name">{stage.name}</p>
      <div className="ag-money"><strong>{soles(selected.current_amount)}</strong><span>de {soles(selected.target_amount)}</span></div>
      <div className="ag-progress-title"><span>Tu avance</span><strong>{gardenNumber(value)} %</strong></div><progress max={100} value={value} aria-label={`Avance de ${selected.title}`}/>
      <p className="ag-growth-copy">{prefs.simple?`${gardenNumber(value)} % de tu meta. Cada aporte cuenta.`:stage.message}</p>
      <div className={`ag-pace ${rhythm.kind==='review'?'ag-review':''}`}><span className="ag-pace-icon" aria-hidden="true">{rhythm.kind==='complete'?'✓':rhythm.kind==='review'?'↻':'↗'}</span><div><strong>{rhythm.label}</strong><p>{prefs.simple?(rhythm.kind==='review'?'Puedes ajustar el plan. Tu ahorro se conserva.':rhythm.kind==='complete'?'¡Meta conseguida!': 'Cada aporte cuenta.'):rhythm.message}</p></div></div>
      <dl className="ag-deadline"><div><dt>Fecha objetivo</dt><dd>{goalDateLabel(selected.target_date)}</dd></div><div><dt>Tiempo transcurrido</dt><dd>{rhythm.expected===null?'Sin referencia de plazo':`${gardenNumber(rhythm.expected)} % del plazo`}</dd></div></dl>
      <button className="ag-contribute" onClick={()=>onContribute(selected)}>Registrar un aporte <span aria-hidden="true">↗</span></button>
      <p className="ag-confirm-help">El aporte irá a <strong>{selected.title}</strong>. Revisarás el monto antes de guardarlo.</p>
    </aside>}
    </div>
    <p className="ag-sr-only" role="status" aria-live="polite">{selected?`Maceta seleccionada: ${selected.title}. ${gardenNumber(value)} por ciento. ${stage.name}. ${rhythm?.label}.`:'Aún no hay metas en este espacio.'}</p>
  </section>;
}

export function GoalCard({goal,groups,today,onView,onContribute}:{goal:Goal;groups:Group[];today:string;onView:()=>void;onContribute:()=>void}) {
  const value=goalPercent(goal),phase=GROWTH_STAGES[growthStage(value)];
  return <article className="av-goal-card"><div className="ag-card-art"><Plant percent={value}/><span className="ag-card-type">{groupLabel(goal,groups)}</span></div><div className="ag-card-body"><h2>{goal.title}</h2><p>{soles(goal.current_amount)} de {soles(goal.target_amount)}</p><div className="ag-progress-title"><span>{phase.name}</span><strong>{gardenNumber(value)} %</strong></div><progress max={100} value={value} aria-label={`Avance de ${goal.title}`}/><p>{goalPace(goal,today).label}</p><p>Fecha objetivo: {goalDateLabel(goal.target_date)}</p><div className="ag-card-actions"><button className="av-secondary" aria-label={`Ver la maceta de ${goal.title}`} onClick={onView}>Ver mi maceta</button><button aria-label={`Registrar un aporte para ${goal.title}`} onClick={onContribute}>Registrar un aporte</button></div></div></article>;
}
