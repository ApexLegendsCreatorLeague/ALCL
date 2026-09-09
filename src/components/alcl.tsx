"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Check, ChevronRight, Search as SearchIcon, Shield, Trophy, Users, X } from "lucide-react";
import { players as demoPlayers, teams as demoTeams } from "@/lib/content";

export const teams = demoTeams.map((team) => team.name);
export const players = demoPlayers.map((player) => player.displayName);

export function LegalDisclaimer() {
  return <p className="legal">This tournament is not affiliated with or sponsored by Electronic Arts Inc.</p>;
}

export function Navbar() {
  return <nav className="nav"><div className="container nav-inner">
    <Link className="brand" href="/"><span className="brand-mark">A</span>ALCL</Link>
    <span className="badge badge-warn">Demo data</span>
    <div className="nav-links"><Link href="/league">League</Link><Link href="/tournaments">Tournaments</Link><Link href="/standings">Standings</Link><Link href="/teams">Teams</Link><Link href="/players">Players</Link><Link href="/championship">Championship</Link><Link aria-label="Search ALCL" href="/teams"><SearchIcon size={16}/></Link><Link className="btn btn-primary nav-cta" href="/register/team">Register <ArrowRight size={14}/></Link></div>
  </div></nav>;
}

export function Footer() {
  return <footer className="footer"><div className="container"><div className="footer-grid">
    <div><div className="brand"><span className="brand-mark">A</span>ALCL</div><p style={{color:"var(--muted)",maxWidth:410,lineHeight:1.6}}>Independent community tournaments for Apex Legends. Built for competitors, organizers, and fans.</p></div>
    <div className="footer-links"><strong style={{color:"white"}}>Compete</strong><Link href="/tournaments">Tournaments</Link><Link href="/standings">Standings</Link><Link href="/rules">Rules</Link><Link href="/register/team">Registration</Link></div>
    <div className="footer-links"><strong style={{color:"white"}}>ALCL</strong><Link href="/championship">Championship</Link><Link href="/hall-of-fame">Hall of fame</Link><Link href="/supporters">Supporters</Link><Link href="/legal">Legal</Link></div>
  </div><LegalDisclaimer/></div></footer>;
}

export function AppShell({children}:{children:React.ReactNode}) { return <div className="shell"><Navbar/><main className="main">{children}</main><Footer/></div>; }

export function StatusBadge({status="Registration open"}:{status?:string}) {
  const live = /live|open|active/i.test(status); return <span className={`badge ${live?"badge-live":"badge-warn"}`}>{live&&"● "}{status}</span>;
}
export function RankBadge({rank}:{rank:number}) { return <span className={`rank ${rank<4?"top":""}`}>{rank.toString().padStart(2,"0")}</span>; }

export function Countdown({to}:{to?:string}) {
  const [left,setLeft]=useState(12*86400000+5*3600000);
  useEffect(()=>{const id=setInterval(()=>setLeft(value=>Math.max(0,value-1000)),1000);return()=>clearInterval(id)},[to]);
  const d=Math.floor(left/86400000), h=Math.floor(left/3600000)%24, m=Math.floor(left/60000)%60;
  return <div className="meta"><strong>{d}D</strong><strong>{h}H</strong><strong>{m}M</strong><span>until check-in</span></div>;
}

export function Hero() {
  return <section className="hero"><div className="container" style={{position:"relative",zIndex:1}}><div className="eyebrow">Season 05 · Now recruiting</div>
    <h1 className="display">THE ARENA<br/><span style={{color:"var(--lime)"}}>BELONGS TO YOU.</span></h1>
    <p>Independent community tournaments for Apex Legends. Compete in structured seasons, build your legacy, and earn your place at the ALCL Championship.</p>
    <div className="actions"><Link className="btn btn-primary" href="/register/team">Register your team <ArrowRight size={15}/></Link><Link className="btn btn-ghost" href="/tournaments">Explore tournaments</Link></div>
    <div className="hero-stats"><div className="hero-stat"><strong>20</strong><span>Community teams</span></div><div className="hero-stat"><strong>$0</strong><span>Entry fees</span></div><div className="hero-stat"><strong>05</strong><span>Community events</span></div></div>
  </div></section>;
}

type CardProps={name?:string;index?:number};
export function TournamentCard({name="ALCL Open Circuit",index=0}:CardProps) { const statuses=["Registration open","Live now","Upcoming","Registration closed","Completed","Completed"]; return <Link href={`/tournaments/${index+1}`} className="card card-accent"><StatusBadge status={statuses[index%statuses.length]}/><h3>{name}</h3><p>{index%2?"Creator and community trios meet in a configurable points event.":"An open-entry path into ALCL Season Qualification."}</p><div className="meta"><span><Calendar size={13}/> Oct {12+index}</span><span><Users size={13}/> {Math.min(20,17+index)}/20</span><span>6 matches</span></div></Link>; }
export function TeamCard({name="Night Shift",index=0}:CardProps) { return <Link href={`/teams/${index+1}`} className="card"><div className="team"><div className="avatar">{name.slice(0,2).toUpperCase()}</div><div><h3 style={{margin:0}}>{name}</h3><span style={{color:"var(--muted)",fontSize:11}}>North America</span></div></div><div className="meta"><span>#{index+1} seed</span><span>{820-index*42} pts</span><span>3 players</span></div></Link>; }
export function PlayerCard({name="Mara Vex",index=0}:CardProps) { return <Link href={`/players/${index+1}`} className="card"><div className="team"><div className="avatar">{name.split(" ").map(x=>x[0]).join("")}</div><div><h3 style={{margin:0}}>{name}</h3><span style={{color:"var(--lime)",fontSize:11}}>{teams[index%teams.length]}</span></div></div><PlayerStats compact index={index}/></Link>; }
export function SupporterCard({name="Obsidian Tier",index=0}:CardProps) { return <div className="card"><div className="avatar"><Shield size={18}/></div><h3>{name}</h3><p>{["Community-backed broadcast partner","Season event supporter","Grassroots circuit contributor"][index%3]}</p><StatusBadge status="Verified supporter"/></div>; }

export function PlayerStats({compact=false,index=0}:{compact?:boolean;index?:number}) { const data=[["Elims",String(Math.max(12,64-index))],["Avg. dmg",String(Math.max(380,711-index*4))],["Wins",String(Math.max(1,8-Math.floor(index/9)))]]; return <div className={compact?"meta":"grid grid-3"} style={{marginTop:compact?16:0}}>{data.map(([k,v])=><div className={compact?"":"card stat"} key={k}><strong>{v}</strong> <span>{k}</span></div>)}</div>; }
export function StatCard({label,value,change}:{label:string;value:string;change?:string}) { return <div className="card stat"><span>{label}</span><strong>{value}</strong>{change&&<small style={{color:"var(--lime)"}}>{change}</small>}</div>; }

export function StandingsTable({limit=20}:{limit?:number}) { return <div className="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Events</th><th>Wins</th><th>Top 5s</th><th>Kills</th><th>Event Pts</th><th>Season Pts</th><th>Status</th></tr></thead><tbody>{teams.slice(0,limit).map((t,i)=><tr key={t}><td><RankBadge rank={i+1}/></td><td><div className="team"><div className="avatar">{t.slice(0,2)}</div>{t}</div></td><td>{i<12?3:2}</td><td>{Math.max(0,4-Math.floor(i/4))}</td><td>{Math.max(1,11-Math.floor(i/2))}</td><td>{128-i*4}</td><td>{Math.max(18,92-i*3)}</td><td><strong>{Math.max(20,126-i*5)}</strong></td><td><StatusBadge status={i<12?"Qualifying":"In contention"}/></td></tr>)}</tbody></table></div>; }
export function ScoreTable(){return <div className="table-wrap"><table><thead><tr><th>Game</th><th>Winner</th><th>Placement</th><th>Eliminations</th><th>Total</th></tr></thead><tbody>{[1,2,3,4,5].map((n,i)=><tr key={n}><td>Round {n}</td><td>{teams[i]}</td><td>{12-i}</td><td>{9+i}</td><td><strong>{21+i}</strong></td></tr>)}</tbody></table></div>}
export function Leaderboard(){return <StandingsTable/>}
export function AdminTable({kind="entry"}:{kind?:string}) { return <div className="table-wrap"><table><thead><tr><th>{kind}</th><th>Status</th><th>Updated</th><th>Owner</th><th>Actions</th></tr></thead><tbody>{teams.slice(0,5).map((t,i)=><tr key={t}><td><strong>{t}</strong></td><td><StatusBadge status={i===3?"Needs review":"Active"}/></td><td>{i+1}h ago</td><td>{players[i]}</td><td><button className="btn">Edit</button> <button className="btn btn-ghost">Review</button></td></tr>)}</tbody></table></div>; }

export function MatchCard({index=0}:{index?:number}) { return <div className="card match"><div className="team"><div className="avatar">{teams[index].slice(0,2)}</div>{teams[index]}</div><div><StatusBadge status={index===0?"Live":"Scheduled"}/><div className="score">{index===0?"42 — 38":"—"}</div><small style={{color:"var(--muted)"}}>Match {index+1}</small></div><div className="team"><div className="avatar">{teams[index+1].slice(0,2)}</div>{teams[index+1]}</div></div>; }
export function QualificationProgress({value=72}:{value?:number}) { return <div className="card"><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><strong>Championship qualification</strong><span style={{color:"var(--lime)"}}>{value}%</span></div><div className="progress"><span style={{width:`${value}%`}}/></div><p>Top 12 advance after the final circuit event.</p></div>; }
export function TournamentTimeline(){return <div className="timeline">{["Registration","Qualifiers","Group stage","Finals"].map((s,i)=><div className={`timeline-item ${i<2?"done":""}`} key={s}><div className="dot">{i<2?<Check size={14}/>:i+1}</div><strong style={{color:i<2?"white":undefined}}>{s}</strong><br/>Oct {4+i*7}</div>)}</div>}
export function TeamRoster(){return <div className="grid grid-3">{players.slice(0,3).map((p,i)=><PlayerCard name={p} index={i} key={p}/>)}</div>}

export function Search({placeholder="Search ALCL…"}:{placeholder?:string}) { const [q,setQ]=useState(""); return <div className="search"><SearchIcon className="search-icon" size={17}/><input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder}/></div>; }
export function Modal({title="Confirm action",children,onClose}:{title?:string;children?:React.ReactNode;onClose:()=>void}) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="card modal" onMouseDown={e=>e.stopPropagation()}><button className="btn btn-ghost" onClick={onClose} style={{float:"right"}}><X size={15}/></button><h3>{title}</h3>{children}<div className="actions"><button className="btn btn-primary" onClick={onClose}>Confirm</button><button className="btn" onClick={onClose}>Cancel</button></div></div></div>; }
export function Toast({message,onClose}:{message:string;onClose?:()=>void}) { useEffect(()=>{if(!onClose)return;const id=setTimeout(onClose,2500);return()=>clearTimeout(id)},[onClose]);return <div className="toast">✓ {message}</div>; }
export function EmptyState(){return <div className="state"><Trophy size={28}/><h3>No results yet</h3><p>Results will appear when the first match concludes.</p></div>}
export function LoadingState(){return <div className="state"><div className="spinner"/>Loading circuit data…</div>}
export function ErrorState(){return <div className="state"><X size={28}/><h3>Couldn’t load this view</h3><button className="btn">Try again</button></div>}

export function RegistrationWizard() {
 const [step,setStep]=useState(0); const [toast,setToast]=useState(false);
 const labels=["Team","Roster","Eligibility","Review","Submit"];
 return <div className="wizard"><div className="wizard-steps">{labels.map((x,i)=><div className={`wizard-step ${step===i?"active":""}`} key={x}>0{i+1} · {x}</div>)}</div>
  <div className="card"><StatusBadge status={`Step ${step+1} of 5`}/><h3>{["Team information","Build your roster","Eligibility","Review application","Submit"][step]}</h3>
  {step===0&&<div className="form"><Field label="Team name" placeholder="e.g. Northstar"/><Field label="Abbreviation" placeholder="NST"/><Field label="Region" select/><Field label="Manager email" placeholder="manager@example.com"/><Field label="Website" placeholder="https://"/><Field label="Social link" placeholder="https://"/></div>}
  {step===1&&<div className="form">{[1,2,3,4,5].map(n=><div className="card" key={n}><strong>{n<=3?`Starter ${n}`:`Substitute ${n-3}`}</strong><Field label="Display name" placeholder="Competitive display name"/><Field label="Platform" select/><Field label="Role" select/><Field label="Rank at registration" select/></div>)}</div>}
  {step===2&&<div className="form"><div className="card"><strong>Roster eligibility</strong><p>Rank is self-reported and snapshotted at submission. The default rule allows no more than one Predator across all five competitive roster slots.</p></div><label><input type="checkbox"/> I confirm every player meets the published event eligibility requirements.</label><label><input type="checkbox"/> I understand roster changes after the deadline require organizer approval.</label></div>}
  {step===3&&<div><div className="card"><strong>Review before submission</strong><p>Check the team, roster, platform, role, contact, and rank snapshot details. Eligibility is recalculated securely when submitted.</p></div><p style={{color:"var(--lime)",fontSize:12}}><Shield size={13}/> ALCL never requests EA passwords, credentials, or authentication tokens.</p></div>}
  {step===4&&<div><div className="card"><strong>Ready to submit</strong><p>Your timestamped registration will be sent to organizers with a Pending status. Demo mode does not transmit private data.</p></div><label><input type="checkbox"/> I accept the published event rules and terms of participation.</label></div>}
  <div className="actions">{step>0&&<button className="btn" onClick={()=>setStep(step-1)}>Back</button>}<button className="btn btn-primary" onClick={()=>step<4?setStep(step+1):setToast(true)}>{step<4?"Continue":"Submit registration"} <ChevronRight size={14}/></button></div>
  </div>{toast&&<Toast message="Demo registration submitted" onClose={()=>setToast(false)}/>}</div>;
}
function Field({label,placeholder,select}:{label:string;placeholder?:string;select?:boolean}) { return <div className="field"><label>{label}</label>{select?<select className="input"><option>North America</option><option>EMEA</option><option>APAC</option></select>:<input className="input" placeholder={placeholder}/>}</div>; }

export function AdminActions({title}:{title:string}) { const [modal,setModal]=useState(false);const [toast,setToast]=useState(false);return <><div className="toolbar"><Search placeholder={`Search ${title.toLowerCase()}…`}/><button className="btn btn-primary" onClick={()=>setModal(true)}>Create new</button></div>{modal&&<Modal title={`Create ${title.slice(0,-1)}`} onClose={()=>{setModal(false);setToast(true)}}><div className="form"><Field label="Name" placeholder="Enter a name"/><Field label="Status" select/></div></Modal>}{toast&&<Toast message="Demo changes saved" onClose={()=>setToast(false)}/>}</>}

export function SectionTitle({eyebrow,title,copy,action}:{eyebrow:string;title:string;copy?:string;action?:React.ReactNode}) { return <div className="section-head"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{copy&&<p>{copy}</p>}</div>{action}</div>; }
export function PageHeader({eyebrow,title,copy}:{eyebrow:string;title:string;copy:string}) { return <div className="page-head"><div className="container"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{copy}</p></div></div>; }

export function BroadcastView({type}:{type:string}) { return <div className="broadcast"><div className="broadcast-panel"><div className="eyebrow">ALCL · Public streaming overlay</div><h2 className="display" style={{fontSize:42,margin:"10px 0"}}>{type.toUpperCase()}</h2>{type==="match"?<MatchCard/>:type==="player"?<div className="grid grid-2"><PlayerCard/><PlayerStats/></div>:<StandingsTable limit={4}/>}<p className="legal">This tournament is not affiliated with or sponsored by Electronic Arts Inc.</p></div></div>; }
