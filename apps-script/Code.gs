/** CNE Attendance backend. Bound to the Google Sheet: Extensions > Apps Script. */
const ADMIN_PASSWORD = 'CHANGE_ME';
const UNITS = ['Nursing Admin','Nursing Supervisor','Headnurse','ER','OPD','AICU','PICU','HDU','EU','OR\\DSU\\PACU','NICU','L&D','OBGYNE','PW','FMSW','MMSW','Intern','CSSD','PHC','Other'];
const HEAD = ['Timestamp','ID No.','Full Name','Unit','Topic','Speaker','Lecture Date','Location Status','Distance (m)'];
const P = PropertiesService.getScriptProperties();

function setup(){ staff_(); }
function out_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function cfg_(){ const g=k=>P.getProperty(k)||''; return {sheet:g('sheet'),topic:g('topic'),speaker:g('speaker'),date:g('date'),dateIso:g('dateIso'),from:+g('from')||0,until:+g('until')||0,lat:+g('lat')||0,lng:+g('lng')||0,radius:+g('radius')||300}; }
function normId_(s){ return String(s||'').replace(/[٠-٩]/g,d=>d.charCodeAt(0)-1632).replace(/[۰-۹]/g,d=>d.charCodeAt(0)-1776).replace(/\s+/g,''); }
function clean_(s,n){ return String(s||'').replace(/[\r\n\t]+/g,' ').replace(/^[=+\-@]+/,'').trim().slice(0,n); }
function staff_(){ const ss=SpreadsheetApp.getActive(); let sh=ss.getSheetByName('Staff'); if(!sh){ sh=ss.insertSheet('Staff'); sh.appendRow(['ID No.','Full Name','Unit','Last Updated']); sh.getRange('A:A').setNumberFormat('@'); sh.setFrozenRows(1); sh.getRange(1,1,1,4).setFontWeight('bold'); } return sh; }
function sess_(){ return SpreadsheetApp.getActive().getSheetByName(cfg_().sheet); }
function newSheet_(base){ const ss=SpreadsheetApp.getActive(); let n=String(base).replace(/[\[\]*?:\/\\]/g,' ').trim().slice(0,90)||'Session',name=n,i=2; while(ss.getSheetByName(name)) name=n+' ('+(i++)+')';
  const sh=ss.insertSheet(name); sh.appendRow(HEAD); sh.getRange('B:B').setNumberFormat('@'); sh.setFrozenRows(1); sh.getRange(1,1,1,HEAD.length).setFontWeight('bold').setBackground('#D8EFF0'); return name; }

function doGet(e){ const p=e.parameter||{};
  if(p.action==='config'){ const c=cfg_(),n=Date.now(); return out_({ok:true,topic:c.topic,speaker:c.speaker,date:c.date,open:!!(c.sheet&&sess_()&&n>=c.from&&n<=c.until),units:UNITS}); }
  if(p.action==='find'){ const id=normId_(p.id); if(id.length<3) return out_({ok:true,found:false});
    const d=staff_().getDataRange().getValues(); for(let i=1;i<d.length;i++) if(String(d[i][0])===id) return out_({ok:true,found:true,name:String(d[i][1]),unit:String(d[i][2])}); return out_({ok:true,found:false}); }
  return out_({ok:false}); }

function doPost(e){ let b; try{ b=JSON.parse(e.postData.contents); }catch(x){ return out_({ok:false,error:'Bad request'}); }
  const lock=LockService.getScriptLock(); lock.waitLock(20000);
  try{ if(b.action==='submit') return out_(submit_(b));
    if(b.password!==ADMIN_PASSWORD) return out_({ok:false,error:'Wrong password'});
    if(b.action==='save') return out_(save_(b));
    if(b.action==='close'){ P.setProperty('until',String(Date.now()-1)); }
    if(b.action==='location'){ if(!isFinite(b.lat)||!isFinite(b.lng)) return out_({ok:false,error:'Invalid location'}); P.setProperties({lat:String(b.lat),lng:String(b.lng),radius:String(Math.min(5000,Math.max(50,+b.radius||300)))}); }
    if(b.action==='delete'){ const sh=sess_(); if(sh&&b.row>1&&String(sh.getRange(b.row,2).getValue())===String(b.id)) sh.deleteRow(b.row); }
    return out_(state_());
  } finally { lock.releaseLock(); } }

function save_(b){ const topic=clean_(b.topic,150),speaker=clean_(b.speaker,100),date=clean_(b.date,30);
  if(!topic||!speaker||!date) return {ok:false,error:'Fill topic, speaker and date.'}; if(!(+b.until>+b.from)) return {ok:false,error:'Invalid time window.'};
  P.setProperties({topic:topic,speaker:speaker,date:date,dateIso:clean_(b.dateIso,10),from:String(+b.from),until:String(+b.until)});
  if(b.newSession||!sess_()) P.setProperty('sheet',newSheet_(date+' - '+topic));
  return state_(); }

function state_(){ const c=cfg_(),sh=sess_(),rows=[],counts={Inside:0,Outside:0,Refused:0};
  if(sh&&sh.getLastRow()>1){ const d=sh.getRange(2,1,sh.getLastRow()-1,HEAD.length).getValues(); d.forEach((r,i)=>{ const l=String(r[7]); if(counts[l]!==undefined) counts[l]++;
    rows.push({row:i+2,time:Utilities.formatDate(new Date(r[0]),Session.getScriptTimeZone(),'HH:mm:ss'),id:String(r[1]),name:String(r[2]),unit:String(r[3]),loc:l,dist:r[8]}); }); }
  return {ok:true,cfg:c,rows:rows,counts:counts}; }

function dist_(a,b,c,d){ const R=6371000,t=x=>x*Math.PI/180,dl=t(c-a),dn=t(d-b),h=Math.sin(dl/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }

function submit_(b){ if(b.hp) return {ok:true};
  const c=cfg_(),sh=sess_(),n=Date.now();
  if(!c.sheet||!sh||n<c.from||n>c.until) return {ok:false,code:'closed',error:'Attendance is closed.'};
  const id=normId_(b.id),name=clean_(b.name,100); let unit=clean_(b.unit,80);
  if(!/^[A-Za-z0-9\-]{3,30}$/.test(id)) return {ok:false,error:'Enter your full ID number.'};
  if(name.length<3) return {ok:false,error:'Enter your full name.'};
  const base=unit.replace(/^Other:.*/,'Other'); if(UNITS.indexOf(base)<0||(base==='Other'&&unit.length<8)) return {ok:false,error:'Select your unit.'};
  if(sh.getLastRow()>1 && sh.getRange(2,2,sh.getLastRow()-1,1).getValues().some(r=>String(r[0])===id)) return {ok:false,error:'This ID is already registered for this lecture.'};
  let status='Refused',dist='';
  if(b.geo!=='refused'&&isFinite(b.lat)&&isFinite(b.lng)){ if(!c.lat) status='Not set'; else { dist=Math.round(dist_(c.lat,c.lng,+b.lat,+b.lng)); status=dist<=c.radius?'Inside':'Outside'; } }
  const stamp=new Date(); sh.appendRow([stamp,id,name,unit,c.topic,c.speaker,c.date,status,dist]);
  const st=staff_(),d=st.getDataRange().getValues(); let r=0; for(let i=1;i<d.length;i++) if(String(d[i][0])===id){ r=i+1; break; }
  if(r) st.getRange(r,2,1,3).setValues([[name,unit,stamp]]); else st.appendRow([id,name,unit,stamp]);
  return {ok:true}; }
