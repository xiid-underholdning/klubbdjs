import { useState, useCallback, useRef, useEffect } from "react";

/* ─── APP CONFIG ─────────────────────────────────────────────────────────── */
const APP  = { name:"KLUBB DJs", sub:"by XIID", city:"Oslo" };
const ADMIN_PASS = "xiid2024";
const LS = "kd6_";

/* ─── LOCALSTORAGE LAYER ─────────────────────────────────────────────────── */
function useLS(key, init) {
  const [v, sv] = useState(() => {
    try { const s=localStorage.getItem(LS+key); return s?JSON.parse(s):init; }
    catch { return init; }
  });
  const set = useCallback(upd => sv(p => {
    const n = typeof upd==="function" ? upd(p) : upd;
    try { localStorage.setItem(LS+key, JSON.stringify(n)); } catch {}
    return n;
  }), [key]);
  return [v, set];
}
const ssGet = k => { try { const s=localStorage.getItem(LS+k); return s?JSON.parse(s):null; } catch { return null; } };
const ssSet = (k,v) => { try { localStorage.setItem(LS+k, JSON.stringify(v)); } catch {} };

/* ─── COLORS ─────────────────────────────────────────────────────────────── */
const C = {
  bg:"#07070f", surface:"#10101e", card:"#181830", border:"#25254a",
  accent:"#5d3ef8", hi:"#7c5fff", pop:"#a78bfa",
  gold:"#f0b429", green:"#0abd74", red:"#f43f5e", pink:"#f472b6",
  txt:"#e8e6ff", muted:"#6b699a", dim:"#32305a",
};
const FF = '"DM Sans","Helvetica Neue",sans-serif';

/* ─── UTILS ──────────────────────────────────────────────────────────────── */
let _n = 100;
const uid = () => `${++_n}${Math.random().toString(36).slice(2,5)}`;
const projNum = () => {
  const key = "kd6_projctr";
  const n = parseInt(localStorage.getItem(key)||"1000", 10) + 1;
  localStorage.setItem(key, String(n));
  return `XIID-${new Date().getFullYear()}-${n}`;
};
const today = () => new Date().toISOString().slice(0,10);
const addDays = n => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const fmtNOK  = n => new Intl.NumberFormat("nb-NO",{style:"currency",currency:"NOK",minimumFractionDigits:0}).format(n);
const fmtDate = d => new Date(d+"T12:00:00").toLocaleDateString("nb-NO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const nowTS   = () => new Date().toLocaleTimeString("nb-NO",{hour:"2-digit",minute:"2-digit"});
const stars   = n => "★".repeat(n) + "☆".repeat(5-n);
const mapsUrl = (address,city) => { const q=encodeURIComponent(`${address}, ${city}`); return { google:`https://www.google.com/maps/search/?api=1&query=${q}`, apple:`https://maps.apple.com/?q=${q}` }; };

function MapsLinks({address, city, sm}) {
  if (!address) return null;
  const m = mapsUrl(address, city);
  return (
    <div style={{display:"flex",gap:8,marginTop:2}}>
      <a href={m.google} target="_blank" rel="noopener noreferrer" style={{fontSize:sm?10:11,color:C.pop,textDecoration:"none"}}>🗺 Google Maps</a>
      <a href={m.apple}  target="_blank" rel="noopener noreferrer" style={{fontSize:sm?10:11,color:C.pop,textDecoration:"none"}}>🍎 Apple Maps</a>
    </div>
  );
}

function FeePreview({start, end}) {
  const {hours, totalFee} = calcFee(start, end);
  return (
    <div style={{background:`${C.accent}16`,border:`1px solid ${C.accent}44`,borderRadius:8,padding:"7px 11px",marginBottom:12,fontSize:12}}>
      {hours}t · Total: <strong style={{color:C.pop}}>{fmtNOK(totalFee)}</strong>
    </div>
  );
}

function calcFee(s, e) {
  const m = t => { const [h,mn]=t.split(":").map(Number); return h*60+mn; };
  let mins = m(e)-m(s); if (mins<=0) mins+=1440;
  const hours = Math.round(mins/60*10)/10;
  return { hours, djFee: hours*1000, totalFee: hours*1000+1000 };
}
function timesOverlap(s1,e1,s2,e2) {
  const m=t=>{const[h,mn]=t.split(":").map(Number);return h*60+mn;};
  let[a1,b1]=[m(s1),m(e1)]; if(b1<=a1)b1+=1440;
  let[a2,b2]=[m(s2),m(e2)]; if(b2<=a2)b2+=1440;
  return a1<b2&&a2<b1;
}
function hasDJConflict(djId, job, jobs) {
  return jobs.some(j=>j.bookedDjId===djId&&j.status==="booked"&&j.date===job.date&&j.id!==job.id&&timesOverlap(j.startTime,j.endTime,job.startTime,job.endTime));
}
function genRecurring(dow, from, to) {
  const dates=[]; const d=new Date(from+"T12:00:00"); const end=new Date(to+"T12:00:00");
  while(d.getDay()!==dow&&d<=end) d.setDate(d.getDate()+1);
  while(d<=end){ dates.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+7); }
  return dates;
}
function generateICS(jobs) {
  const esc=s=>(s||"").replace(/[,;\\]/g,"\\$&").replace(/\n/g,"\\n");
  const dt=(date,time)=>date.replace(/-/g,"")+"T"+time.replace(":","")+"00";
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","CALSCALE:GREGORIAN","PRODID:-//KLUBB DJs by XIID//NO"];
  jobs.forEach(j=>{
    lines.push("BEGIN:VEVENT",`UID:${j.id}@klubbdjs`,
      `DTSTART;TZID=Europe/Oslo:${dt(j.date,j.startTime)}`,
      `DTEND;TZID=Europe/Oslo:${dt(j.date,j.endTime)}`,
      `SUMMARY:${esc(j.venueName)}${j.bookedDjName?" – "+esc(j.bookedDjName):""}`,
      `DESCRIPTION:KLUBB DJs by XIID\\nSjanger: ${esc((j.genres||[]).join(", "))}`,
      "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
function downloadICS(content, fn="klubbdjs.ics") {
  const a=document.createElement("a");
  a.href="data:text/calendar;charset=utf-8,"+encodeURIComponent(content);
  a.download=fn; a.click();
}
function avgRating(djId, jobs) {
  const r=jobs.filter(j=>j.bookedDjId===djId&&j.ratings?.venueGiven);
  return r.length ? (r.reduce((s,j)=>s+j.ratings.venueGiven,0)/r.length).toFixed(1) : null;
}
function avgVenueRating(venueId, jobs) {
  const r=jobs.filter(j=>j.venueId===venueId&&j.ratings?.djGiven);
  return r.length ? (r.reduce((s,j)=>s+j.ratings.djGiven,0)/r.length).toFixed(1) : null;
}
function mkAvatar(name, size=80) {
  const ini=(name||"").replace(/["""']/g,"").split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase()||"?";
  const g=[["5d3ef8","a78bfa"],["059669","34d399"],["d97706","fbbf24"],["dc2626","f87171"],["2563eb","60a5fa"],["db2777","f472b6"],["0891b2","22d3ee"],["7c3aed","c084fc"]];
  const[c1,c2]=g[(name||"").length%g.length]; const fs=Math.round(size*.38),cy=Math.round(size*.63);
  return "data:image/svg+xml,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><linearGradient id="g"><stop offset="0%" stop-color="#${c1}"/><stop offset="100%" stop-color="#${c2}"/></linearGradient></defs><rect width="${size}" height="${size}" rx="${size}" fill="url(#g)"/><text x="50%" y="${cy}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${fs}" font-weight="bold">${ini}</text></svg>`);
}
async function toB64(file,mx=220){
  return new Promise(res=>{
    const r=new FileReader(); r.onload=e=>{const img=new Image();img.onload=()=>{const s=Math.min(img.width,img.height),cv=document.createElement("canvas");cv.width=mx;cv.height=mx;cv.getContext("2d").drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,mx,mx);res(cv.toDataURL("image/jpeg",.78));};img.src=e.target.result;};r.readAsDataURL(file);
  });
}

/* ─── GENRES & INSTRUMENTS ───────────────────────────────────────────────── */
const GENRES=["Afro House","Tech House","Deep House","Melodic House","Classic House","Techno","Minimal Techno","Trance","Progressive","Hard Dance","EDM","Kommers / Pop","NRK Hits","Allsang","Dansband","Schlager","Hip Hop","R&B / Soul","Trap","Afrobeats","Reggaeton","Latin","80-taller","90-taller","00-taller","Throwback","Rock","Indie / Alternative","Funk / Disco","Nu Disco","Jazz","Blues","Lounge / Chill","Ambient","Drum & Bass","UK Garage","Dubstep","Hardstyle","Etter-ski / Après-ski","Festival / Open Air","Live Saks","Live Trompet","Live Gitar","Live Piano","Live Vokal","DJ + Live Hybrid","Bryllup / Privat","Sommerfest / Bedrift"];

const AREAS = [
  "Oslo",
  "Bergen",
  "Trondheim",
  "Stavanger / Sandnes",
  "Tromsø",
  "Kristiansand",
  "Fredrikstad / Sarpsborg",
  "Drammen",
  "Asker / Bærum",
  "Østfold",
  "Innlandet",
  "Vestfold / Telemark",
  "Agder",
  "Møre og Romsdal",
  "Troms og Finnmark",
  "Nordland",
  "Hele Norge",
];
const INSTRUMENTS=["Saks","Fiolin","Trompet","Trommer / Perkusjon","Gitar","Vokalist","Trubadur","Danser"];
const WEEKDAYS=["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];

/* ─── VILKÅR ─────────────────────────────────────────────────────────────── */
const T_VENUE=[{t:"Oppdragsgivers ansvar",b:"Oppdragsgiver er ansvarlig for profesjonelt lyd- og teknisk utstyr, klart ved artists ankomst."},{t:"1. Transport og opphold",b:"Transport og opphold dekkes av oppdragsgiver og legges til faktura.\nReise: JA · Hotell: JA"},{t:"2. Arbeidsdager",b:"Arbeidsdag >10 t: +kr 2 000,-/artist. Ekstra døgn: kr 5 000,-/artist/døgn."},{t:"3. Betaling",b:"XIID fakturerer oppdragsgiver. Artisten fakturerer XIID. Forfall: minimum 7 dager."},{t:"4. Avlysning",b:"Etter signering: 50 % · Innen 2 mnd: 75 % · Innen 30 dager: 100 % av honorar."},{t:"5. Øvrige",b:"Alle vilkår bindende. Endringer skriftlig. Norsk rett. Oslo tingrett."}];
const T_DJ=[{t:"Artistens rolle",b:"Artisten er selvstendig næringsdrivende, ikke ansatt av XIID AS."},{t:"1. Fakturering",b:"Artisten fakturerer XIID AS – aldri utestedet direkte.\nSats: kr 1 000,-/t + kr 1 000,- fast påslag."},{t:"2. Transport",b:"Dekkes av oppdragsgiver via XIID. Artisten møter presis."},{t:"3. Standard",b:"Møt presis. Lever avtalt program. Opptré profesjonelt. Varsle XIID ved hindringer."},{t:"4. Avlysning",b:"Avlysning etter bekreftet booking: honorar mistes, artist kan suspenderes."},{t:"5. Øvrige",b:"XIID AS kan markedsføre samarbeidet. Norsk rett. Oslo tingrett."}];
const T_CONTRACT=[{t:"Avtalens formål",b:"Bekrefter avtalen mellom oppdragsgiver og artist, formidlet av KLUBB DJs by XIID AS."},{t:"Betaling",b:"XIID AS fakturerer oppdragsgiver. Artisten fakturerer XIID AS. Ingen direkte betalingsforhold."},{t:"Avlysning",b:"Etter signering: 50 % · Innen 2 mnd: 75 % · Innen 30 dager: 100 % av honorar."},{t:"Forpliktelser",b:"Artist: møt presis, lever avtalt program. Oppdragsgiver: utstyr klart, betal i tide."},{t:"Gjeldende rett",b:"Norsk rett. Oslo tingrett."}];

/* ─── DEMO DATA ──────────────────────────────────────────────────────────── */
const DEMO_DJS = [
  {id:"dj0",role:"dj",artistType:"dj",areas:["Oslo"],name:'Viktor "VK" Strand',email:"dj1@demo.xiid",password:"demo123",phone:"+47 99 100 200",instagram:"vikstrand_dj",genres:["Tech House","Afro House","Deep House"],bio:"10 år bak bordet. Resident på Blå og Jaeger.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=viktor`},
  {id:"dj1",role:"dj",artistType:"dj",areas:["Oslo","Bergen"],name:"Camille Berg",email:"dj2@demo.xiid",password:"demo123",phone:"+47 99 200 300",instagram:"camilleberg_music",genres:["Deep House","Nu Disco","Melodic House","Lounge / Chill"],bio:"Soulful og groovy. Festivalerfaring fra hele Norden.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=camille`},
  {id:"dj2",role:"dj",artistType:"dj",areas:["Oslo"],name:'Andreas "ADRX" Dahl',email:"dj3@demo.xiid",password:"demo123",phone:"+47 99 300 400",instagram:"adrx_official",genres:["Hip Hop","R&B / Soul","Trap","Afrobeats"],bio:"Oslo-rapper og DJ. Jobbet med store norske artister.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=adrx`},
  {id:"dj3",role:"dj",artistType:"dj",areas:["Oslo"],name:"Silje Moen",email:"dj4@demo.xiid",password:"demo123",phone:"+47 99 400 500",instagram:"siljemoen",genres:["Kommers / Pop","NRK Hits","Allsang","90-taller"],bio:"Allsangfavoritten i Oslo. Fullt gulv garantert.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=silje`},
  {id:"dj4",role:"dj",artistType:"dj",areas:["Oslo","Bergen","Trondheim"],name:'Bjørn "BEAT" Lie',email:"dj5@demo.xiid",password:"demo123",phone:"+47 99 500 600",instagram:"beatlie_techno",genres:["Techno","Minimal Techno","Drum & Bass"],bio:"Dyp og mørk techno. Berlin-resident, hjemsted Oslo.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=bjornlie`},
  {id:"dj5",role:"dj",artistType:"instrumentalist",instrument:"Saks",areas:["Oslo"],name:"Frida Holm",email:"dj6@demo.xiid",password:"demo123",phone:"+47 99 600 700",instagram:"fridaholm_sax",genres:["Live Saks","DJ + Live Hybrid","Deep House"],bio:"Live saksofon over DJ-set. Uforglemmelig opplevelse.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=fridah`},
  {id:"dj6",role:"dj",artistType:"dj",areas:["Oslo"],name:'Magnus "MXO" Eide',email:"dj7@demo.xiid",password:"demo123",phone:"+47 99 700 800",instagram:"mxo_oslo",genres:["Afrobeats","Reggaeton","Latin","Hip Hop"],bio:"Fra Lagos til Oslo. Fyller alltid dansegulvet.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=magnusmxo`},
  {id:"dj7",role:"dj",artistType:"dj",areas:["Oslo"],name:"Thea Kraft",email:"dj8@demo.xiid",password:"demo123",phone:"+47 99 800 900",instagram:"theakraft_dj",genres:["80-taller","90-taller","Allsang","Dansband","Schlager"],bio:"Dronningen av nostalgi og allsang. 15 år i bransjen.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=theakraft`},
  {id:"dj8",role:"dj",artistType:"dj",areas:["Oslo"],name:'Sander "SNDR" Vold',email:"dj9@demo.xiid",password:"demo123",phone:"+47 99 900 010",instagram:"sndr_vold",genres:["Tech House","Funk / Disco","Nu Disco","Classic House"],bio:"Groovy basslinjer. Bringer 70-tallets sjel til gulvet.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=sndr`},
  {id:"dj9",role:"dj",artistType:"instrumentalist",instrument:"Trompet",areas:["Oslo","Hele Norge"],name:'Lena "LNX" Moe',email:"dj10@demo.xiid",password:"demo123",phone:"+47 99 010 020",instagram:"lnxmoe_trumpet",genres:["Etter-ski / Après-ski","Kommers / Pop","EDM","Live Trompet"],bio:"Live trompet og MC. Fyller enhver après-bar.",avatar:`https://api.dicebear.com/7.x/personas/svg?seed=lnamoe`},
];
const DEMO_VENUES=[
  {id:"ve0",name:"Blå",city:"Oslo",address:"Brenneriveien 9C, 0182 Oslo",ownerIds:["vu0"],favorites:["dj0","dj8","dj4"]},
  {id:"ve1",name:"Jaeger",city:"Oslo",address:"Grensen 9, 0159 Oslo",ownerIds:["vu1"],favorites:["dj1","dj2"]},
  {id:"ve2",name:"The Villa",city:"Oslo",address:"Møllergata 23, 0179 Oslo",ownerIds:["vu2"],favorites:[]},
  {id:"ve3",name:"Bibliotekbar",city:"Oslo",address:"Universitetsgata 26, 0162 Oslo",ownerIds:["vu3"],favorites:[]},
  {id:"ve4",name:"Heiskroken",city:"Oslo",address:"Grünerhagen 2, 0178 Oslo",ownerIds:["vu0","vu4"],favorites:[]},
  {id:"ve5",name:"Club Gossip",city:"Oslo",address:"Kristian IVs gate 12, 0154 Oslo",ownerIds:["vu5"],favorites:[]},
  {id:"ve6",name:"Dattera til Haagen",city:"Oslo",address:"Grønland 10, 0188 Oslo",ownerIds:["vu6"],favorites:[]},
  {id:"ve7",name:"Revolver",city:"Oslo",address:"Møllergata 32, 0179 Oslo",ownerIds:["vu7"],favorites:[]},
  {id:"ve8",name:"Kulturhuset",city:"Oslo",address:"Youngs gate 6, 0181 Oslo",ownerIds:["vu8"],favorites:[]},
  {id:"ve9",name:"Skybar Radisson",city:"Oslo",address:"Holbergs gate 30, 0166 Oslo",ownerIds:["vu9"],favorites:[]},
];
const DEMO_VUSERS=[
  {id:"vu0",role:"venue",name:"Blå",email:"venue1@demo.xiid",password:"demo123",phone:"",venueIds:["ve0","ve4"]},
  {id:"vu1",role:"venue",name:"Jaeger",email:"venue2@demo.xiid",password:"demo123",phone:"",venueIds:["ve1"]},
  {id:"vu2",role:"venue",name:"The Villa",email:"venue3@demo.xiid",password:"demo123",phone:"",venueIds:["ve2"]},
  {id:"vu3",role:"venue",name:"Bibliotekbar",email:"venue4@demo.xiid",password:"demo123",phone:"",venueIds:["ve3"]},
  {id:"vu4",role:"venue",name:"Heiskroken",email:"venue5@demo.xiid",password:"demo123",phone:"",venueIds:["ve4"]},
  {id:"vu5",role:"venue",name:"Club Gossip",email:"venue6@demo.xiid",password:"demo123",phone:"",venueIds:["ve5"]},
  {id:"vu6",role:"venue",name:"Dattera til Haagen",email:"venue7@demo.xiid",password:"demo123",phone:"",venueIds:["ve6"]},
  {id:"vu7",role:"venue",name:"Revolver",email:"venue8@demo.xiid",password:"demo123",phone:"",venueIds:["ve7"]},
  {id:"vu8",role:"venue",name:"Kulturhuset",email:"venue9@demo.xiid",password:"demo123",phone:"",venueIds:["ve8"]},
  {id:"vu9",role:"venue",name:"Skybar Radisson",email:"venue10@demo.xiid",password:"demo123",phone:"",venueIds:["ve9"]},
];
function mj(id,vi,days,st,et,genres,desc,status,intI,bI,msgs) {
  const ve=DEMO_VENUES[vi]; const{hours,djFee,totalFee}=calcFee(st,et);
  const bDj=(status==="booked"&&bI!==null)?DEMO_DJS[bI]:null;
  return{id,projectNum:`XIID-${new Date().getFullYear()}-${id.replace("j","")}00${id.replace("j","")}`,venueId:ve.id,venueName:ve.name,city:"Oslo",venueAddress:ve.address||"",date:addDays(days),startTime:st,endTime:et,genres,description:desc,hours,djFee,totalFee,targetMode:"all",targetDjIds:[],status,
    interested:(intI||[]).map(i=>({djId:DEMO_DJS[i].id,djName:DEMO_DJS[i].name,avatar:DEMO_DJS[i].avatar})),
    bookedDjId:bDj?.id||null,bookedDjName:bDj?.name||null,bookedAt:status==="booked"?new Date().toISOString():null,
    messages:msgs||[],invoiced:false,cancelRequest:null,ratings:{venueGiven:null,djGiven:null}};
}
const DEMO_JOBS=[
  mj("j1",0,7,"22:00","03:00",["Tech House","Afro House"],"Fredag kveld. Smart casual.","open",[0,8],null,[]),
  mj("j2",1,14,"23:00","04:00",["Kommers / Pop","NRK Hits"],"Lørdag – full plass!","open",[3],null,[]),
  mj("j3",2,21,"21:00","02:00",["Hip Hop","R&B / Soul","Afrobeats"],"R&B/hip hop night.","open",[2,6],null,[]),
  mj("j4",3,10,"22:00","02:00",["Deep House","Nu Disco"],"Åpningskveld ny sesong.","open",[],null,[]),
  mj("j5",5,5,"00:00","04:00",["Techno","Minimal Techno"],"Sene timer, underground.","open",[4,1],null,[]),
  mj("j6",3,3,"20:00","01:00",["Lounge / Chill","Nu Disco"],"Privat firmafest.","booked",[],1,[{id:"m1",fromId:"vu3",fromName:"Bibliotekbar",fromRole:"venue",text:"Hei Camille! CDJ-3000er klart 🎉",ts:"20:15"},{id:"m2",fromId:"dj1",fromName:"Camille Berg",fromRole:"dj",text:"Supert, gleder meg! 🙌",ts:"20:42"}]),
  mj("j7",6,6,"22:00","03:00",["Allsang","90-taller","Kommers / Pop"],"Fredagsbar.","booked",[],3,[]),
  mj("j8",0,15,"23:00","04:00",["Afro House","Tech House"],"Lørdag main stage.","booked",[],8,[]),
  mj("j9",4,2,"21:00","01:00",["Etter-ski / Après-ski"],"Après-ski – energi!","booked",[],9,[]),
  mj("j10",9,8,"22:00","05:00",["Kommers / Pop","EDM"],"Stor fredagsfest.","open",[3],null,[]),
];
const INIT_USERS  = [...DEMO_DJS,...DEMO_VUSERS];
const INIT_VENUES = DEMO_VENUES;
const INIT_JOBS   = DEMO_JOBS;

/* ─── APP ────────────────────────────────────────────────────────────────── */
export default function App() {
  const [users,   setUsers]   = useLS("users",   INIT_USERS);
  const [venues,  setVenues]  = useLS("venues",  INIT_VENUES);
  const [jobs,    setJobs]    = useLS("jobs",    INIT_JOBS);
  const [pending, setPending] = useLS("pending", []);
  const [session, setSession] = useLS("session", null);
  const [notifs, setNotifs]   = useLS("notifs", []);
  const addNotif=(userId,msg)=>setNotifs(n=>[{id:uid(),userId,msg,ts:nowTS(),read:false},...n].slice(0,50));
  const markRead=userId=>setNotifs(n=>n.map(x=>x.userId===userId?{...x,read:true}:x));
  const [activeVenueId, setActiveVenueId] = useLS("activeVenue", null);

  const user        = session ? users.find(u=>u.id===session.id)||session : null;
  const login       = u => { setSession(u); setActiveVenueId(u.venueIds?.[0]||null); };
  const logout      = () => { setSession(null); setActiveVenueId(null); };
  const updateUser  = upd => { setUsers(us=>us.map(u=>u.id===upd.id?upd:u)); setSession(upd); };
  const activeVenue = venues.find(v=>v.id===activeVenueId)||null;

  if (!user) return (
    <LoginPage users={users} pending={pending} onLogin={login}
      onRegisterPending={reg=>setPending(p=>[...p,reg])}/>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:FF}}>
      <AppHeader user={user} venues={venues} activeVenueId={activeVenueId}
        onSwitch={setActiveVenueId} jobs={jobs} onLogout={logout}
        notifs={notifs.filter(n=>n.userId===user?.id)} onMarkRead={()=>markRead(user?.id)}/>
      {user.role==="venue"&&<VenueView user={user} users={users} venues={venues} jobs={jobs} activeVenue={activeVenue}
        onJobs={setJobs} onVenues={setVenues} onUpdateUser={updateUser}
        onPending={reg=>setPending(p=>[...p,reg])} addNotif={addNotif}/>}
      {user.role==="dj"&&<DJView user={user} jobs={jobs} onJobs={setJobs} onUpdateUser={updateUser} addNotif={addNotif} myNotifs={notifs.filter(n=>n.userId===user?.id)}/>}
      {user.role==="admin"&&<AdminView users={users} venues={venues} jobs={jobs} pending={pending}
        onApprove={reg=>{
          if(reg.type==="new-venue"){
            // Existing user creating a new venue – just create venue and link user
            setVenues(v=>[...v,reg.venueData]);
            setUsers(us=>us.map(u=>u.id===reg.userId?{...u,venueIds:[...(u.venueIds||[]),reg.venueData.id]}:u));
          } else {
            // New registration (DJ or venue+user)
            setUsers(u=>[...u,reg.userData]);
            if(reg.venueData)setVenues(v=>[...v,reg.venueData]);
          }
          setPending(p=>p.filter(x=>x.id!==reg.id));
        }}
        onReject={reg=>setPending(p=>p.filter(x=>x.id!==reg.id))}
        onJobs={setJobs} onUsers={setUsers} onVenues={setVenues}/>}
    </div>
  );
}

/* ─── HEADER ─────────────────────────────────────────────────────────────── */
function NotifBell({notifs,unread,showN,onToggle}) {
  return (
    <div style={{position:"relative"}}>
      <button onClick={onToggle}
        style={{...btnBase,background:"transparent",border:`1px solid ${unread>0?C.gold:C.border}`,color:unread>0?C.gold:C.muted,padding:"5px 10px",fontSize:14,position:"relative"}}>
        🔔{unread>0&&<span style={{position:"absolute",top:-5,right:-5,background:C.red,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</span>}
      </button>
      {showN&&<div style={{position:"absolute",right:0,top:44,width:290,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.5)",zIndex:300,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:.8}}>Varsler</div>
        <div style={{maxHeight:300,overflowY:"auto"}}>
          {(notifs||[]).length===0&&<div style={{padding:"18px 14px",color:C.dim,fontSize:12,textAlign:"center"}}>Ingen varsler ennå</div>}
          {(notifs||[]).slice(0,12).map(n=>(
            <div key={n.id} style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}`,background:n.read?C.card:`${C.accent}12`}}>
              <div style={{fontSize:12,color:C.txt,lineHeight:1.4}}>{n.msg}</div>
              <div style={{fontSize:10,color:C.dim,marginTop:3}}>{n.ts}</div>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}

function AppHeader({user,venues,activeVenueId,onSwitch,jobs,onLogout,notifs,onMarkRead}) {
  const [showN,setShowN]=useState(false);
  const unread=(notifs||[]).filter(n=>!n.read).length;
  const myV = user.role==="venue" ? (user.venueIds||[]).map(id=>venues.find(v=>v.id===id)).filter(Boolean) : [];
  return (
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 14px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <AppLogo/>
        <Bdg col={C.accent} sm>📍 {APP.city}</Bdg>
        {user.role==="venue"&&myV.length>1
          ?<select value={activeVenueId||""} onChange={e=>onSwitch(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.txt,fontSize:12,borderRadius:6,padding:"3px 8px",outline:"none",cursor:"pointer",fontFamily:FF}}>
            {myV.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          :<span style={{color:C.muted,fontSize:12}}>{user.role==="venue"?"🏢 "+(myV[0]?.name||user.name):user.role==="dj"?"🎧 "+user.name:"⚡ Admin"}</span>}
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <NotifBell notifs={notifs} unread={unread} showN={showN} onToggle={()=>{setShowN(p=>!p);if(unread>0)onMarkRead?.();}} />
        <Btn outline onClick={onLogout}>Logg ut</Btn>
      </div>
    </div>
  );
}

/* ─── LOGIN ──────────────────────────────────────────────────────────────── */
function LoginPage({users,pending,onLogin,onRegisterPending}) {
  const saved = ssGet("lastLogin")||{};
  const [mode,setMode]=useState("start");
  const [form,setForm]=useState({email:saved.email||"",role:saved.role||"",artistType:"dj",...saved});
  const [genres,setGenres]=useState([]);
  const [err,setErr]=useState("");
  const [done,setDone]=useState(false);
  const [regAvatar,setRegAvatar]=useState(null);
  const [showDJTerms,setShowDJTerms]=useState(false);
  const [showVenueTerms,setShowVenueTerms]=useState(false);
  const [manual,setManual]=useState(null);
  const handleRegPhoto = async e => { const f=e.target.files?.[0]; if(f){const b=await toB64(f);setRegAvatar(b);} };

  const fv=(k,v)=>setForm(p=>({...p,[k]:v}));
  const tg=g=>setGenres(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);

  const doLogin=()=>{
    if(!form.role)return setErr("Velg rolle");
    const isPend=(pending||[]).some(p=>p.userData?.email?.toLowerCase()===form.email?.toLowerCase()&&p.userData?.role===form.role);
    if(isPend)return setErr("Søknaden din er under behandling av XIID.");
    const u=users.find(u=>u.email?.toLowerCase()===form.email?.toLowerCase()&&u.role===form.role);
    if(!u)return setErr("Finner ikke bruker med den e-posten i den rollen.");
    if(u.password&&u.password!==form.pass)return setErr("Feil passord.");
    ssSet("lastLogin",{email:form.email,role:form.role});
    onLogin(u);
  };
  const doAdmin=()=>{
    if(form.pass===ADMIN_PASS)onLogin({id:"admin",role:"admin",name:"XIID Admin",email:"admin@xiid.no"});
    else setErr("Feil passord.");
  };
  const submitVenue=()=>{
    const name   = form.name?.trim()  || "";
    const email  = form.email?.trim() || "";
    const pass   = form.pass?.trim()  || "";
    const vname  = form.vname?.trim() || "";
    if(!name || !email || !pass || !vname) return;
    const u2=uid(), vId=uid();
    onRegisterPending({id:uid(),type:"venue",createdAt:new Date().toISOString(),
      userData:{id:u2,role:"venue",name,email,phone:form.phone||"",password:pass,venueIds:[vId]},
      venueData:{id:vId,name:vname,city:APP.city,address:form.address||"",ownerIds:[u2],favorites:[]}});
    setShowVenueTerms(false);
    setShowDJTerms(false);
    setDone(true);
  };
  const submitDJ=()=>{
    const name  = form.name?.trim()  || "";
    const email = form.email?.trim() || "";
    const pass  = form.pass?.trim()  || "";
    if(!name || !email || !pass) return;
    onRegisterPending({id:uid(),type:"dj",createdAt:new Date().toISOString(),
      userData:{id:uid(),role:"dj",artistType:form.artistType||"dj",instrument:form.instrument||"",
        name,email,phone:form.phone||"",password:pass,genres:[...genres],
        areas:[...(form.areas||[])],
        bio:form.bio||"",instagram:form.instagram||"",avatar:regAvatar||null}});
    setShowDJTerms(false);
    setShowVenueTerms(false);
    setDone(true);
  };
  const tryShowDJTerms=()=>{
    if(!form.name?.trim()||!form.email?.trim()||!form.pass?.trim())return setErr("Navn, e-post og passord er påkrevd");
    if(form.pass!==form.pass2)return setErr("Passordene er ikke like");
    if(genres.length===0)return setErr("Velg minst én sjanger");
    if(!form.areas?.length)return setErr("Velg minst ett område du opererer i");
    setErr(""); setShowDJTerms(true);
  };
  const tryShowVenueTerms=()=>{
    if(!form.name?.trim()||!form.email?.trim()||!form.pass?.trim()||!form.vname?.trim())return setErr("Alle felt er påkrevd");
    if(form.pass!==form.pass2)return setErr("Passordene er ikke like");
    setErr(""); setShowVenueTerms(true);
  };

  if(done)return(
    <Center>
      <AppLogo big/>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:28,textAlign:"center",marginTop:16}}>
        <div style={{fontSize:36,marginBottom:12}}>📬</div>
        <h2 style={{margin:"0 0 10px",color:C.txt}}>Søknad sendt!</h2>
        <p style={{color:C.muted,fontSize:13,lineHeight:1.7,margin:"0 0 18px"}}>
          Din søknad er sendt til <strong style={{color:C.pop}}>XIID AS</strong>.<br/>
          Du kan logge inn etter at XIID har godkjent profilen din.
        </p>
        <button onClick={()=>{setDone(false);setMode("login");setErr("");}}
          style={{fontFamily:FF,fontWeight:700,fontSize:13,borderRadius:8,padding:"10px 20px",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${C.accent},${C.hi})`,color:"#fff"}}>
          Gå til innlogging
        </button>
      </div>
    </Center>
  );

  if(mode==="start")return(
    <Center>
      {manual&&<ManualModal role={manual} onClose={()=>setManual(null)}/>}
      <div style={{textAlign:"center",marginBottom:32}}><AppLogo big/><div style={{marginTop:10}}><Bdg col={C.accent} sm>📍 Kun {APP.city}</Bdg></div></div>
      <div style={{display:"grid",gap:8,marginBottom:10}}>
        {[{icon:"🏢",t:"Jeg er et utested",s:"Legg ut jobber og book artister",m:"venue",hi:true},{icon:"🎧",t:"Jeg er DJ / Artist",s:"Se ledige jobber og ta oppdrag",m:"dj",hi:false}].map(o=>(
          <button key={o.m} onClick={()=>{setMode(o.m);setGenres([]);setErr("");}} style={{...cs,cursor:"pointer",textAlign:"left",marginBottom:0,border:`1px solid ${o.hi?C.accent:C.border}`,background:o.hi?`${C.accent}18`:C.card,padding:14}}>
            <div style={{fontSize:22,marginBottom:4}}>{o.icon}</div><div style={{fontWeight:700,marginBottom:2,color:C.txt}}>{o.t}</div><div style={{color:C.muted,fontSize:11}}>{o.s}</div>
          </button>
        ))}
      </div>
      <Btn outline full onClick={()=>{setMode("login");setErr("");}} style={{marginBottom:8}}>Logg inn</Btn>
      <Btn outline full onClick={()=>{setMode("admin");setForm({});setErr("");}} style={{opacity:.35}}>XIID Admin</Btn>
    </Center>
  );

  return(
    <Center><AppLogo/><Card style={{marginTop:12}}>
      {mode==="login"&&<><h2 style={{margin:"0 0 14px",fontSize:15}}>Logg inn</h2>
        <Lbl>Rolle</Lbl><select defaultValue={form.role} style={is} onChange={e=>fv("role",e.target.value)}><option value="">Velg…</option><option value="venue">Utested</option><option value="dj">DJ / Artist</option></select>
        <LF lbl="E-post" type="email" defaultValue={form.email} onChange={v=>fv("email",v)}/>
        <PassField lbl="Passord" value={form.pass} onChange={v=>fv("pass",v)}/>
        {err&&<Em msg={err}/>}
        <Row><Btn onClick={doLogin}>Logg inn</Btn><Btn outline onClick={()=>setMode("start")}>Tilbake</Btn></Row>
        <div style={{marginTop:12,textAlign:"center"}}>
          <button onClick={()=>{const s=encodeURIComponent("Glemt passord – KLUBB DJs");const b=encodeURIComponent(`Hei XIID,\n\nJeg har glemt passordet mitt.\nE-post: ${form.email||"(fyll inn)"}\nRolle: ${form.role||"(fyll inn)"}\n\nVennligst hjelp meg med å gjenopprette tilgangen.\n\nMvh`);window.open(`mailto:admin@xiid.no?subject=${s}&body=${b}`,"_blank");}}
            style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",textDecoration:"underline",fontFamily:FF}}>
            Glemt passord?
          </button>
        </div></>}
      {mode==="admin"&&<><h2 style={{margin:"0 0 14px",fontSize:15}}>Admin</h2><PassField lbl="Passord" value={form.pass} onChange={v=>fv("pass",v)}/>{err&&<Em msg={err}/>}<Row><Btn onClick={doAdmin}>Logg inn</Btn><Btn outline onClick={()=>setMode("start")}>Tilbake</Btn></Row></>}
      {mode==="venue"&&(
        showVenueTerms
        ? <TermsBox title="Oppdragsgivervilkår" terms={T_VENUE} onAccept={submitVenue} onBack={()=>setShowVenueTerms(false)} acceptLabel="Send søknad til XIID"/>
        : <><h2 style={{margin:"0 0 12px",fontSize:15}}>🏢 Registrer utested</h2>
        <div style={{marginBottom:10,padding:"7px 10px",background:`${C.accent}18`,borderRadius:8,fontSize:12,color:C.pop}}>📍 By låst til {APP.city}</div>
        <div style={{marginBottom:10}}><Lbl>Kontaktperson *</Lbl><input style={{...is,marginBottom:0}} type="text" value={form.name||""} onChange={e=>fv("name",e.target.value)}/></div>
        <div style={{marginBottom:10}}><Lbl>E-post *</Lbl><input style={{...is,marginBottom:0}} type="email" value={form.email||""} onChange={e=>fv("email",e.target.value)}/></div>
        <PassField lbl="Passord *" value={form.pass} onChange={v=>fv("pass",v)} placeholder="Min. 4 tegn"/>
        <PassField lbl="Gjenta passord *" value={form.pass2} onChange={v=>fv("pass2",v)} placeholder="Skriv passordet igjen"/>
        <div style={{marginBottom:10}}><Lbl>Stedsnavn *</Lbl><input style={{...is,marginBottom:0}} type="text" placeholder="f.eks. Bar Oslo" value={form.vname||""} onChange={e=>fv("vname",e.target.value)}/></div>
        <div style={{marginBottom:10}}><Lbl>Adresse *</Lbl><input style={{...is,marginBottom:0}} type="text" placeholder="f.eks. Karl Johans gate 1, 0154 Oslo" value={form.address||""} onChange={e=>fv("address",e.target.value)}/></div>
        <div style={{marginBottom:10}}><Lbl>Telefon</Lbl><input style={{...is,marginBottom:0}} type="text" value={form.phone||""} onChange={e=>fv("phone",e.target.value)}/></div>
        {err&&<div style={{color:C.red,fontSize:12,marginBottom:10,padding:"6px 10px",background:`${C.red}15`,borderRadius:7}}>{err}</div>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={tryShowVenueTerms} style={{...btnBase,background:`linear-gradient(135deg,${C.accent},${C.hi})`,color:"#fff",border:"none"}}>Neste: Vilkår →</button>
          <button onClick={()=>setMode("start")} style={{...btnBase,background:"transparent",color:C.pop,border:`1px solid ${C.accent}`}}>Tilbake</button>
        </div>
        </>
      )}
      {mode==="dj"&&(
        showDJTerms
        ? <TermsBox title="Artistvilkår" terms={T_DJ} onAccept={submitDJ} onBack={()=>setShowDJTerms(false)} acceptLabel="Send søknad til XIID"/>
        : <><h2 style={{margin:"0 0 12px",fontSize:15}}>🎧 Registrer Artist</h2>
        <div style={{textAlign:"center",marginBottom:14}}>
          <Img src={regAvatar} name={form.name||"?"} size={80} style={{display:"block",margin:"0 auto 10px",border:`3px solid ${regAvatar?C.green:C.border}`}}/>
          <label style={{...btnBase,border:`1px solid ${regAvatar?C.green:C.accent}`,color:regAvatar?C.green:C.pop,background:regAvatar?`${C.green}15`:"transparent",padding:"6px 14px",cursor:"pointer",fontSize:12,display:"inline-block"}}>
            {regAvatar?"✓ Bilde lastet opp":"📷 Last opp profilbilde"}
            <input type="file" accept="image/*" style={{display:"none"}} onChange={handleRegPhoto}/>
          </label>
        </div>
        <Lbl>Type *</Lbl>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[["dj","🎧 DJ"],["instrumentalist","🎸 Instrumentalist"]].map(([v,lbl])=>(
            <label key={v} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"8px 10px",borderRadius:8,border:`1px solid ${(form.artistType||"dj")===v?C.hi:C.border}`,background:(form.artistType||"dj")===v?`${C.accent}20`:C.surface,flex:1,fontSize:12,fontFamily:FF}}>
              <input type="radio" name="atype" value={v} defaultChecked={v==="dj"} onChange={()=>fv("artistType",v)} style={{accentColor:C.accent}}/>{lbl}
            </label>
          ))}
        </div>
        {form.artistType==="instrumentalist"&&<><Lbl>Instrument *</Lbl><select style={{...is,marginBottom:12}} onChange={e=>fv("instrument",e.target.value)}><option value="">Velg…</option>{INSTRUMENTS.map(i=><option key={i} value={i}>{i}</option>)}</select></>}
        <div style={{marginBottom:10}}><Lbl>Artistnavn *</Lbl><input style={{...is,marginBottom:0}} type="text" value={form.name||""} onChange={e=>fv("name",e.target.value)}/></div>
        <div style={{marginBottom:10}}><Lbl>E-post *</Lbl><input style={{...is,marginBottom:0}} type="email" value={form.email||""} onChange={e=>fv("email",e.target.value)}/></div>
        <PassField lbl="Passord *" value={form.pass} onChange={v=>fv("pass",v)} placeholder="Min. 4 tegn"/>
        <PassField lbl="Gjenta passord *" value={form.pass2} onChange={v=>fv("pass2",v)} placeholder="Skriv passordet igjen"/>
        <div style={{marginBottom:10}}><Lbl>Telefon</Lbl><input style={{...is,marginBottom:0}} type="text" value={form.phone||""} onChange={e=>fv("phone",e.target.value)}/></div>
        <div style={{marginBottom:10}}><Lbl>Instagram (uten @)</Lbl><input style={{...is,marginBottom:0}} type="text" placeholder="ditt_brukernavn" value={form.instagram||""} onChange={e=>fv("instagram",e.target.value)}/></div>
        <Lbl>Sjangrene du spiller * ({genres.length} valgt)</Lbl>
        <div style={{border:`1px solid ${C.border}`,borderRadius:8,padding:8,maxHeight:180,overflowY:"auto",background:C.surface,marginBottom:10}}>
          {GENRES.map(g=><span key={g} style={chip(genres.includes(g))} onClick={()=>tg(g)}>{g}</span>)}
        </div>
        <div style={{marginBottom:10}}>
          <Lbl>Bio</Lbl>
          <textarea style={{...is,height:64,resize:"vertical",marginBottom:0}} placeholder="Litt om deg og ditt sound…" value={form.bio||""} onChange={e=>fv("bio",e.target.value)}/>
        </div>
        <div style={{marginBottom:12}}>
          <Lbl>Områder du opererer i * ({(form.areas||[]).length} valgt)</Lbl>
          <div style={{border:`1px solid ${C.border}`,borderRadius:8,padding:8,background:C.surface}}>
            {AREAS.map(a=>{
              const on=(form.areas||[]).includes(a);
              return <span key={a} style={chip(on)} onClick={()=>fv("areas",on?(form.areas||[]).filter(x=>x!==a):[...(form.areas||[]),a])}>{a}</span>;
            })}
          </div>
        </div>
        {err&&<div style={{color:C.red,fontSize:12,marginBottom:10,padding:"6px 10px",background:`${C.red}15`,borderRadius:7}}>{err}</div>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={tryShowDJTerms} style={{...btnBase,background:`linear-gradient(135deg,${C.accent},${C.hi})`,color:"#fff",border:"none"}}>Neste: Vilkår →</button>
          <button onClick={()=>setMode("start")} style={{...btnBase,background:"transparent",color:C.pop,border:`1px solid ${C.accent}`}}>Tilbake</button>
        </div>
        </>
      )}
    </Card></Center>
  );
}

/* ─── ADMIN VIEW ─────────────────────────────────────────────────────────── */
function AdminView({users,venues,jobs,pending,onApprove,onReject,onJobs,onUsers,onVenues}) {
  const [tab,setTab]=useState("cal");
  const [editUser,setEditUser]=useState(null);
  const [editVenue,setEditVenue]=useState(null);
  const djs=users.filter(u=>u.role==="dj");
  const vUsers=users.filter(u=>u.role==="venue");
  const booked=jobs.filter(j=>j.status==="booked");
  const open=jobs.filter(j=>j.status==="open");
  const totR=booked.reduce((s,j)=>s+(j.totalFee||0),0);
  const totDJ=booked.reduce((s,j)=>s+(j.djFee||0),0);
  const pList=pending||[];

  return(
    <Page>
      {editUser&&<EditUserModal user={editUser} onSave={upd=>{onUsers(us=>us.map(u=>u.id===upd.id?upd:u));setEditUser(null);}} onClose={()=>setEditUser(null)}/>}
      {editVenue&&<EditVenueModal venue={editVenue} onSave={upd=>{onVenues(vs=>vs.map(v=>v.id===upd.id?upd:v));setEditVenue(null);}} onClose={()=>setEditVenue(null)}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        <SC label="Søknader" value={pList.length} color={pList.length>0?C.gold:C.muted}/>
        <SC label="Bookinger" value={booked.length} color={C.green}/>
        <SC label="Omsetning" value={fmtNOK(totR)} color={C.pop} sm/>
        <SC label="Margin XIID" value={fmtNOK(totR-totDJ)} color={C.pink} sm/>
      </div>
      <Tabs tabs={[["pending",`Søknader${pList.length>0?" ("+pList.length+")":""}`],["artists","Artister"],["venueList","Utesteder"],["invoice","Fakturering"],["search","Søk jobber"],["cal","Kalender"],["konto","Min konto"]]} active={tab} onChange={setTab}/>

      {tab==="pending"&&<>
        <Sec>Søknader til godkjenning</Sec>
        {pList.length===0&&<Empty text="Ingen søknader"/>}
        {pList.map(reg=>{
          const isNewVenue = reg.type==="new-venue";
          return(
            <Card key={reg.id} style={{borderLeft:`3px solid ${isNewVenue?C.green:C.gold}`}}>
              <div style={{marginBottom:10}}>
                {isNewVenue
                  ?<Bdg col={C.green} sm>🏢 Nytt utested</Bdg>
                  :<Bdg col={reg.type==="dj"?C.accent:C.green} sm>{reg.type==="dj"?"🎧 "+(reg.userData?.artistType==="instrumentalist"?"Instrumentalist":"DJ"):"🏢 Ny bruker + utested"}</Bdg>}

                {isNewVenue
                  ?<>
                    <div style={{fontWeight:700,fontSize:15,marginTop:6}}>{reg.venueData?.name}</div>
                    <div style={{color:C.muted,fontSize:12}}>📍 {reg.venueData?.city}{reg.venueData?.address&&" · "+reg.venueData.address}</div>
                    <div style={{color:C.muted,fontSize:12,marginTop:3}}>Søkt av: <strong>{reg.userName}</strong></div>
                  </>
                  :<>
                    <div style={{fontWeight:700,fontSize:15,marginTop:6}}>{reg.userData?.name}</div>
                    <div style={{color:C.muted,fontSize:12}}>{reg.userData?.email}{reg.userData?.phone&&" · "+reg.userData.phone}</div>
                    {reg.venueData&&<div style={{color:C.muted,fontSize:12}}>Sted: <strong>{reg.venueData.name}</strong> – {reg.venueData.city}</div>}
                    {reg.userData?.instrument&&<div style={{color:C.muted,fontSize:12}}>Instrument: {reg.userData.instrument}</div>}
                    {reg.userData?.bio&&<div style={{color:C.muted,fontSize:12,marginTop:4,fontStyle:"italic"}}>"{reg.userData.bio}"</div>}
                    {reg.userData?.genres&&<div style={{marginTop:6}}>{reg.userData.genres.map(g=><span key={g} style={chip(false)}>{g}</span>)}</div>}
                  </>}
                <div style={{color:C.dim,fontSize:11,marginTop:6}}>Søkt: {new Date(reg.createdAt).toLocaleString("nb-NO")}</div>
              </div>
              <Row><Btn green onClick={()=>onApprove(reg)}>✓ Godkjenn</Btn><Btn red onClick={()=>onReject(reg)}>✕ Avslå</Btn></Row>
            </Card>
          );
        })}
      </>}

      {tab==="artists"&&<AdminArtists djs={djs} booked={booked} jobs={jobs} onUsers={onUsers} onEditUser={setEditUser}/>}

      {tab==="venueList"&&<>
        <Sec>Utesteder ({venues.length})</Sec>
        {venues.map(ve=>{
          const veJ=booked.filter(j=>j.venueId===ve.id);
          const tot=veJ.reduce((s,j)=>s+(j.totalFee||0),0);
          const rating=avgVenueRating(ve.id,jobs);
          return(
            <Card key={ve.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{ve.name}</div>
                  <div style={{color:C.muted,fontSize:12}}>📍 {ve.city} · {ve.ownerIds.length} bruker(e)</div>
                  <MapsLinks address={ve.address} city={ve.city}/>
                  {rating&&<div style={{fontSize:11,color:C.gold}}>{"★".repeat(Math.round(parseFloat(rating)))}{"☆".repeat(5-Math.round(parseFloat(rating)))} {rating}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <div style={{display:"flex",gap:6}}>
                    <Bdg col={C.green} sm>{veJ.length} booking{veJ.length!==1?"er":""}</Bdg>
                    <button onClick={()=>setEditVenue(ve)} style={{...btnBase,background:C.surface,border:`1px solid ${C.border}`,color:C.muted,padding:"4px 8px",fontSize:11}}>Rediger</button>
                    <button onClick={()=>{if(confirm(`Slette ${ve.name}?`))onVenues(vs=>vs.filter(v=>v.id!==ve.id));}} style={{...btnBase,background:`${C.red}20`,border:`1px solid ${C.red}44`,color:C.red,padding:"4px 8px",fontSize:11}}>Slett</button>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:C.dim,fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>Utested-ID</div>
                    <code style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 8px",fontSize:11,color:C.pop,userSelect:"all"}}>{ve.id}</code>
                  </div>
                </div>
              </div>
              {tot>0&&<div style={{marginTop:6,paddingTop:6,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>XIID fakturerer: <strong style={{color:C.green}}>{fmtNOK(tot)}</strong></div>}
            </Card>
          );
        })}
      </>}

      {tab==="invoice"&&<>
        <Sec>Fakturering — alle bookinger</Sec>
        <div style={{marginBottom:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          <SC label="Ikke fakturert" value={booked.filter(j=>!j.invoiced).length} color={C.gold}/>
          <SC label="Fakturert" value={booked.filter(j=>j.invoiced).length} color={C.green}/>
        </div>
        {booked.length===0&&<Empty text="Ingen bookinger"/>}
        {[...booked].sort((a,b)=>a.date.localeCompare(b.date)).map(j=>(
          <Card key={j.id} style={{borderLeft:`3px solid ${j.invoiced?C.green:C.gold}`,opacity:j.invoiced?0.7:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                {j.projectNum&&<div style={{marginBottom:4}}><code style={{background:`${C.accent}20`,border:`1px solid ${C.accent}44`,borderRadius:5,padding:"2px 9px",fontSize:12,color:C.pop,fontWeight:700}}>{j.projectNum}</code></div>}
                <div style={{fontWeight:700}}>{j.venueName}</div>
                <div style={{color:C.muted,fontSize:12}}>{fmtDate(j.date)} · {j.startTime}–{j.endTime}</div>
                <div style={{color:C.muted,fontSize:12}}>🎧 {j.bookedDjName}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,color:C.pop}}>{fmtNOK(j.totalFee||0)}</div>
                <div style={{fontSize:10,color:C.dim}}>DJ får: {fmtNOK(j.djFee||0)}</div>
                <button onClick={()=>onJobs(js=>js.map(x=>x.id===j.id?{...x,invoiced:!x.invoiced}:x))}
                  style={{...btnBase,marginTop:6,background:j.invoiced?`${C.green}25`:`${C.gold}25`,border:`1px solid ${j.invoiced?C.green:C.gold}`,color:j.invoiced?C.green:C.gold,padding:"4px 9px",fontSize:11}}>
                  {j.invoiced?"✓ Fakturert":"Merk fakturert"}
                </button>
              </div>
            </div>
            <div>{(j.genres||[]).map(g=><span key={g} style={chip(true)}>{g}</span>)}</div>
          </Card>
        ))}
        {booked.length>0&&<Card style={{background:`${C.green}10`,border:`1px solid ${C.green}44`,marginTop:4}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            {[{l:"XIID fakturerer",v:totR,c:C.green},{l:"DJer fakturerer XIID",v:totDJ,c:C.pop},{l:"Margin",v:totR-totDJ,c:C.pink}].map(s=>(
              <div key={s.l}><div style={{color:C.muted,fontSize:11,marginBottom:3}}>{s.l}</div><div style={{fontWeight:800,fontSize:14,color:s.c}}>{fmtNOK(s.v)}</div></div>
            ))}
          </div>
        </Card>}
      </>}

      {tab==="search"&&<AdminJobSearch jobs={jobs} users={users} venues={venues}/>}
      {tab==="cal"&&<CalGrid jobs={booked}/>}
      {tab==="konto"&&<><Sec>Min konto</Sec><ChangePassword user={{id:"admin",role:"admin",name:"XIID Admin",email:"admin@xiid.no",password:ADMIN_PASS}} onSave={()=>{}}/></>}
    </Page>
  );
}

function AdminJobSearch({jobs,users,venues}) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const results = !term ? [] : jobs.filter(j =>
    (j.projectNum||"").toLowerCase().includes(term) ||
    (j.bookedDjName||"").toLowerCase().includes(term) ||
    (j.venueName||"").toLowerCase().includes(term) ||
    (j.interested||[]).some(i => i.djName.toLowerCase().includes(term))
  ).sort((a,b)=>a.date.localeCompare(b.date));

  return (
    <div>
      <Sec>Søk i alle jobber</Sec>
      <div style={{position:"relative",marginBottom:16}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:14,pointerEvents:"none"}}>🔍</span>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Søk på prosjektnummer, DJ-navn eller utested…"
          style={{...is,marginBottom:0,paddingLeft:32}}/>
      </div>
      {q&&results.length===0&&<Empty text="Ingen treff"/>}
      {!q&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"24px 0"}}>Skriv inn prosjektnummer, DJ-navn eller stedsnavn</div>}
      {results.map(j=>(
        <Card key={j.id} style={{borderLeft:`3px solid ${j.status==="booked"?C.green:C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div>
              {j.projectNum&&<div style={{marginBottom:4}}><code style={{background:`${C.accent}20`,border:`1px solid ${C.accent}44`,borderRadius:5,padding:"2px 9px",fontSize:12,color:C.pop,fontWeight:700}}>{j.projectNum}</code></div>}
              <div style={{fontWeight:700}}>{j.venueName}</div>
              <div style={{color:C.muted,fontSize:12}}>{fmtDate(j.date)} · {j.startTime}–{j.endTime}</div>
              {j.bookedDjName&&<div style={{color:C.muted,fontSize:12}}>🎧 {j.bookedDjName}</div>}
              {(j.interested||[]).length>0&&!j.bookedDjId&&<div style={{color:C.muted,fontSize:12}}>{j.interested.length} interessert: {j.interested.map(i=>i.djName).join(", ")}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <Bdg col={j.status==="booked"?C.green:C.gold} sm>{j.status==="booked"?"Booket":"Åpen"}</Bdg>
              <div style={{fontWeight:700,color:C.pop,marginTop:4}}>{fmtNOK(j.totalFee||0)}</div>
              {j.invoiced&&<div style={{fontSize:10,color:C.green,marginTop:2}}>✓ Fakturert</div>}
            </div>
          </div>
          <div>{(j.genres||[]).map(g=><span key={g} style={chip(true)}>{g}</span>)}</div>
        </Card>
      ))}
    </div>
  );
}

function AdminArtists({djs,booked,jobs,onUsers,onEditUser}) {
  const djOnly    = djs.filter(d => d.artistType!=="instrumentalist");
  const instrOnly = djs.filter(d => d.artistType==="instrumentalist");

  const ACard = ({dj}) => {
    const djJ    = booked.filter(j=>j.bookedDjId===dj.id);
    const earn   = djJ.reduce((s,j)=>s+(j.djFee||0),0);
    const rating = avgRating(dj.id,jobs);
    const isI    = dj.artistType==="instrumentalist";
    return (
      <Card style={{borderLeft:`3px solid ${isI?C.pink:C.accent}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <Img src={dj.avatar} name={dj.name} size={46}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <div style={{fontWeight:700}}>{dj.name}</div>
              {isI?<Bdg col={C.pink} sm>🎸 {dj.instrument||"Instrumentalist"}</Bdg>:<Bdg col={C.accent} sm>🎧 DJ</Bdg>}
            </div>
            <div style={{color:C.muted,fontSize:11}}>{dj.email}{dj.phone&&" · "+dj.phone}</div>
            {dj.instagram&&<a href={`https://instagram.com/${dj.instagram}`} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.pink,textDecoration:"none"}}>@{dj.instagram}</a>}
            {dj.areas?.length>0&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>📍 {dj.areas.join(" · ")}</div>}
            {rating&&<div style={{fontSize:11,color:C.gold}}>{"★".repeat(Math.round(parseFloat(rating)))}{"☆".repeat(5-Math.round(parseFloat(rating)))} {rating}</div>}
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <Bdg col={djJ.length>0?C.hi:C.dim}>{djJ.length} booking{djJ.length!==1?"er":""}</Bdg>
            <button onClick={()=>onEditUser(dj)} style={{...btnBase,background:C.surface,border:`1px solid ${C.border}`,color:C.muted,padding:"4px 8px",fontSize:11}}>Rediger</button>
            <button onClick={()=>{if(confirm(`Slette ${dj.name}?`))onUsers(us=>us.filter(u=>u.id!==dj.id));}} style={{...btnBase,background:`${C.red}20`,border:`1px solid ${C.red}44`,color:C.red,padding:"4px 8px",fontSize:11}}>Slett</button>
          </div>
        </div>
        {dj.bio&&<div style={{color:C.muted,fontSize:11,fontStyle:"italic",marginBottom:6}}>"{dj.bio}"</div>}
        <div>{(dj.genres||[]).map(g=><span key={g} style={chip(false)}>{g}</span>)}</div>
        {earn>0&&<div style={{marginTop:6,paddingTop:6,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>Fakturerer XIID: <strong style={{color:C.pop}}>{fmtNOK(earn)}</strong></div>}
      </Card>
    );
  };

  return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:16}}>🎧 DJer</div>
        <Bdg col={C.accent}>{djOnly.length}</Bdg>
      </div>
      {djOnly.length===0&&<Empty text="Ingen DJer registrert"/>}
      {djOnly.map(dj=><ACard key={dj.id} dj={dj}/>)}

      <div style={{display:"flex",alignItems:"center",gap:10,margin:"20px 0 12px"}}>
        <div style={{fontWeight:800,fontSize:16}}>🎸 Instrumentalister</div>
        <Bdg col={C.pink}>{instrOnly.length}</Bdg>
      </div>
      {instrOnly.length===0&&<Empty text="Ingen instrumentalister registrert"/>}
      {instrOnly.map(dj=><ACard key={dj.id} dj={dj}/>)}
    </>
  );
}

function EditUserModal({user,onSave,onClose}) {
  const [f,setF]=useState({...user});
  const fv=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <Modal title={`Rediger: ${user.name}`} onClose={onClose}>
      <LF lbl="Navn" defaultValue={f.name} onChange={v=>fv("name",v)}/>
      <LF lbl="E-post" type="email" defaultValue={f.email} onChange={v=>fv("email",v)}/>
      <LF lbl="Telefon" defaultValue={f.phone||""} onChange={v=>fv("phone",v)}/>
      <LF lbl="Instagram (uten @)" defaultValue={f.instagram||""} onChange={v=>fv("instagram",v)}/>
      <LF lbl="Bio" multiline defaultValue={f.bio||""} onChange={v=>fv("bio",v)}/>
      {f.artistType==="instrumentalist"&&<LF lbl="Instrument" defaultValue={f.instrument||""} onChange={v=>fv("instrument",v)}/>}
      <Row><Btn onClick={()=>onSave(f)}>Lagre</Btn><Btn outline onClick={onClose}>Avbryt</Btn></Row>
    </Modal>
  );
}
function EditVenueModal({venue,onSave,onClose}) {
  const [f,setF]=useState({...venue});
  const fv=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <Modal title={`Rediger: ${venue.name}`} onClose={onClose}>
      <LF lbl="Stedsnavn" defaultValue={f.name} onChange={v=>fv("name",v)}/>
      <LF lbl="Adresse" defaultValue={f.address||""} ph="f.eks. Karl Johans gate 1, 0154 Oslo" onChange={v=>fv("address",v)}/>
      <LF lbl="By" defaultValue={f.city||""} onChange={v=>fv("city",v)}/>
      <Row><Btn onClick={()=>onSave(f)}>Lagre</Btn><Btn outline onClick={onClose}>Avbryt</Btn></Row>
    </Modal>
  );
}

/* ─── VENUE VIEW ─────────────────────────────────────────────────────────── */
function VenueView({user,users,venues,jobs,activeVenue,onJobs,onVenues,onUpdateUser,onPending,addNotif}) {
  const [tab,setTab]=useState("cal");
  const [contract,setContract]=useState(null);
  const [djProfileModal,setDjProfileModal]=useState(null);
  const [bookFromProfile,setBookFromProfile]=useState(null);
  const [reBookJob,setReBookJob]=useState(null);   // job to re-book
  const [toast,setToast]=useState(null);           // notification toast
  const djs=users.filter(u=>u.role==="dj");
  const myJobs=activeVenue?jobs.filter(j=>j.venueId===activeVenue.id):[];
  const withInt=myJobs.filter(j=>j.status==="open"&&(j.interested||[]).length>0);
  const cancelReqs=myJobs.filter(j=>j.status==="booked"&&j.cancelRequest);

  if(!activeVenue)return<Page><Card style={{color:C.muted,textAlign:"center",padding:40}}>Ingen utested koblet til kontoen.</Card></Page>;

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast=(msg,col=C.green)=>{
    setToast({msg,col});
    setTimeout(()=>setToast(null),4000);
  };

  // ── Save template on venue object ─────────────────────────────────────────
  const saveTemplate=tpl=>{
    onVenues(vs=>vs.map(v=>v.id===activeVenue.id
      ?{...v,templates:[...(v.templates||[]).filter(t=>t.id!==tpl.id),tpl]}
      :v));
    showToast(`Mal «${tpl.name}» lagret ✓`);
  };
  const deleteTemplate=id=>{
    onVenues(vs=>vs.map(v=>v.id===activeVenue.id
      ?{...v,templates:(v.templates||[]).filter(t=>t.id!==id)}
      :v));
  };

  const toggleFav=djId=>onVenues(vs=>vs.map(v=>v.id===activeVenue.id?{...v,favorites:v.favorites?.includes(djId)?v.favorites.filter(x=>x!==djId):[...(v.favorites||[]),djId]}:v));
  const sendMsg=(jobId,text)=>{if(!text.trim())return;const msg={id:uid(),fromId:user.id,fromName:activeVenue.name,fromRole:"venue",text:text.trim(),ts:nowTS()};onJobs(js=>js.map(j=>j.id===jobId?{...j,messages:[...(j.messages||[]),msg]}:j));};
  const bookDJ=(jobId,djId,djName)=>{
    const job=jobs.find(j=>j.id===jobId);
    // In-app notification to DJ
    addNotif?.(djId, `Du er booket til ${activeVenue?.name} – ${fmtDate(job?.date||"")} ${job?.startTime}–${job?.endTime}`);
    onJobs(js=>js.map(j=>j.id===jobId?{...j,status:"booked",bookedDjId:djId,bookedDjName:djName,bookedAt:new Date().toISOString(),interested:[],ratings:{venueGiven:null,djGiven:null}}:j));
    // Email to venue user only if they opted in
    if(user.notifEmail){
      const subject=encodeURIComponent(`Booking bekreftet – ${djName} – ${job?.date||""}`);
      const body=encodeURIComponent(`${djName} er nå booket til ${activeVenue?.name} ${fmtDate(job?.date||"")} ${job?.startTime}–${job?.endTime}.\n\nProsjektnr: ${job?.projectNum||""}\n\nMvh KLUBB DJs by XIID`);
      window.open(`mailto:${user.email}?subject=${subject}&body=${body}`,"_blank");
    }
    showToast(`✓ ${djName} er booket!`);
  };
  const approveCancelReq=(jobId)=>onJobs(js=>js.map(j=>j.id===jobId?{...j,status:"open",bookedDjId:null,bookedDjName:null,bookedAt:null,cancelRequest:null,interested:[]}:j));
  const rejectCancelReq=(jobId)=>onJobs(js=>js.map(j=>j.id===jobId?{...j,cancelRequest:{...j.cancelRequest,rejected:true}}:j));

  return(
    <Page>
      {/* Toast notification */}
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.col,color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:600,fontSize:13,zIndex:500,boxShadow:"0 4px 20px rgba(0,0,0,.4)",fontFamily:FF}}>{toast.msg}</div>}

      {contract&&<ContractModal job={contract.job} djName={contract.djName} venueName={activeVenue.name}
        onAccept={()=>{bookDJ(contract.job.id,contract.djId,contract.djName);setContract(null);}} onClose={()=>setContract(null)}/>}
      {djProfileModal&&<DJProfileModal dj={djProfileModal} jobs={jobs} venue={activeVenue} onToggleFav={toggleFav}
        onBookDirect={()=>{setBookFromProfile(djProfileModal);setDjProfileModal(null);}} onClose={()=>setDjProfileModal(null)}/>}
      {bookFromProfile&&<BookFromProfileModal dj={bookFromProfile} venue={activeVenue} jobs={jobs}
        onBook={(job,djId,djName)=>{setContract({job,djId,djName});setBookFromProfile(null);}} onClose={()=>setBookFromProfile(null)}/>}
      {reBookJob&&<ReBookModal job={reBookJob} venue={activeVenue}
        onBook={newJob=>{onJobs(js=>[...js,newJob]);setReBookJob(null);setTab("mine");showToast("Jobb opprettet fra mal ✓");}}
        onClose={()=>setReBookJob(null)}/>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        <SC label="Bookinger" value={myJobs.filter(j=>j.status==="booked").length} color={C.green}/>
        <SC label="Venter valg" value={withInt.length} color={C.gold}/>
        <SC label="Avlyse-req." value={cancelReqs.length} color={cancelReqs.length>0?C.red:C.muted}/>
      </div>
      <Tabs tabs={[["cal","Kalender"],["post","+ Ny jobb"],["mine","Mine jobber"],["djs","Finn Artist"],["settings","Innstillinger"]]} active={tab} onChange={setTab}
        badge={{"mine":withInt.length+cancelReqs.length}}/>

      {tab==="cal"&&<CalGrid jobs={myJobs} showExport/>}
      {tab==="post"&&<PostJobForm venue={activeVenue} djs={djs}
        onPost={newJobs=>{
          onJobs(js=>[...js,...newJobs]);
          // Notify matching DJs
          const firstJob=newJobs[0];
          if(firstJob && addNotif) {
            users.filter(u=>u.role==="dj"&&(u.genres||[]).some(g=>(firstJob.genres||[]).includes(g))&&(firstJob.targetMode!=="favorites"||(firstJob.targetDjIds||[]).includes(u.id)))
              .forEach(dj=>{
                if(dj.notifApp!==false) addNotif(dj.id,`Ny jobb: ${activeVenue?.name} – ${fmtDate(firstJob.date)} ${firstJob.startTime}–${firstJob.endTime}${newJobs.length>1?` (+${newJobs.length-1} til)`:""}`);
                if(dj.notifEmail===true&&dj.email){
                  const s=encodeURIComponent(`Ny jobb tilgjengelig – ${activeVenue?.name}`);
                  const b=encodeURIComponent(`Hei ${dj.name}!\n\nNy jobb er lagt ut som matcher profilen din:\n${activeVenue?.name} – ${fmtDate(firstJob.date)} kl ${firstJob.startTime}–${firstJob.endTime}\nSjanger: ${(firstJob.genres||[]).join(", ")}\n\nLogg inn på KLUBB DJs for å melde interesse.\n\nMvh KLUBB DJs by XIID`);
                  window.open(`mailto:${dj.email}?subject=${s}&body=${b}`,"_blank");
                }
              });
          }
          setTab("mine"); showToast(`${newJobs.length} jobb${newJobs.length!==1?"er":""} lagt ut ✓`);
        }}
        onSaveTemplate={saveTemplate}
        onDeleteTemplate={deleteTemplate}/>}
      {tab==="mine"&&<>
        <Sec>Forespørsler — {activeVenue.name}</Sec>
        {cancelReqs.length>0&&<div style={{background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
          <div style={{fontWeight:700,color:C.red,marginBottom:8}}>⚠️ {cancelReqs.length} avlysningsforespørsel{cancelReqs.length!==1?"er":""}</div>
          {cancelReqs.map(j=>(
            <div key={j.id} style={{background:C.surface,borderRadius:8,padding:"8px 10px",marginBottom:6}}>
              <div style={{fontWeight:600}}>{j.bookedDjName} – {fmtDate(j.date)}</div>
              <div style={{color:C.muted,fontSize:12,marginBottom:6}}>Grunn: {j.cancelRequest.reason}</div>
              <Row><Btn green onClick={()=>approveCancelReq(j.id)}>Frigjør plassen</Btn><Btn red onClick={()=>rejectCancelReq(j.id)}>Avslå forespørsel</Btn></Row>
            </div>
          ))}
        </div>}
        {myJobs.length===0&&<Empty text="Ingen forespørsler ennå"/>}
        {[...myJobs].sort((a,b)=>a.date.localeCompare(b.date)).map(j=>(
          <VenueJobCard key={j.id} job={j} djs={djs} jobs={jobs}
            onWantBook={(djId,djName)=>setContract({job:j,djId,djName})}
            onSendMsg={text=>sendMsg(j.id,text)}
            onViewDJProfile={djId=>setDjProfileModal(djs.find(d=>d.id===djId))}
            onRateVenueSide={(val)=>onJobs(js=>js.map(x=>x.id===j.id?{...x,ratings:{...x.ratings,venueGiven:val}}:x))}
            onReBook={()=>setReBookJob(j)}/>
        ))}
      </>}
      {tab==="djs"&&<DJBrowse djs={djs} venue={activeVenue} jobs={jobs} onToggleFav={toggleFav}
        onViewProfile={dj=>setDjProfileModal(dj)} onBookDirect={dj=>setBookFromProfile(dj)}/>}
      {tab==="settings"&&<VenueSettings user={user} venues={venues} onUpdateUser={onUpdateUser} onVenues={onVenues} onPending={onPending}/>}
    </Page>
  );
}

function PostJobForm({venue,onPost,onSaveTemplate,onDeleteTemplate,djs}) {
  const templates=venue?.templates||[];
  const [f,setF]=useState({start:"",end:"",desc:"",tgt:"all",dateMode:"single",singleDate:"",multiDates:[],recurDow:5,recurFrom:"",recurTo:""});
  const [gen,setGen]=useState([]);
  const [err,setErr]=useState("");
  const [tplName,setTplName]=useState("");
  const [showSaveTpl,setShowSaveTpl]=useState(false);
  const [priorityQueue,setPriorityQueue]=useState([]); // [{djId,djName,avatar}] ranked
  const [djSearch,setDjSearch]=useState("");
  const fv=(k,v)=>setF(p=>({...p,[k]:v}));
  const tg=g=>setGen(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);

  const addToPriority=dj=>{
    if(priorityQueue.length>=5)return;
    if(priorityQueue.find(x=>x.djId===dj.id))return;
    setPriorityQueue(p=>[...p,{djId:dj.id,djName:dj.name,avatar:dj.avatar}]);
    setDjSearch("");
  };
  const removePriority=djId=>setPriorityQueue(p=>p.filter(x=>x.djId!==djId));
  const movePriority=(idx,dir)=>{
    const arr=[...priorityQueue];
    const ni=idx+dir;
    if(ni<0||ni>=arr.length)return;
    [arr[idx],arr[ni]]=[arr[ni],arr[idx]];
    setPriorityQueue(arr);
  };

  const filteredDJs=(djs||[]).filter(d=>
    d.name.toLowerCase().includes(djSearch.toLowerCase())&&
    !priorityQueue.find(x=>x.djId===d.id)
  ).slice(0,6);

  const loadTemplate=tpl=>{
    setF(p=>({...p,start:tpl.start,end:tpl.end,desc:tpl.desc||"",tgt:tpl.tgt||"all"}));
    setGen([...tpl.genres]);
    setErr("");
  };

  const addDate=()=>{if(!f.addDateVal)return;if(f.multiDates.includes(f.addDateVal))return;fv("multiDates",[...f.multiDates,f.addDateVal].sort());};
  const removeDate=d=>fv("multiDates",f.multiDates.filter(x=>x!==d));

  const getDates=()=>{
    if(f.dateMode==="single")return f.singleDate?[f.singleDate]:[];
    if(f.dateMode==="multi")return f.multiDates;
    if(f.dateMode==="recurring"&&f.recurFrom&&f.recurTo)return genRecurring(f.recurDow,f.recurFrom,f.recurTo);
    return[];
  };

  const post=()=>{
    setErr("");
    const dates=getDates();
    if(dates.length===0)return setErr("Ingen dato(er) valgt");
    if(!f.start||!f.end)return setErr("Tider mangler");
    if(gen.length===0)return setErr("Velg sjanger");
    const {hours,djFee,totalFee}=calcFee(f.start,f.end);
    const hasPQ=f.tgt==="priority"&&priorityQueue.length>0;
    const targetDjIds=f.tgt==="favorites"?[...(venue.favorites||[])]:hasPQ?[priorityQueue[0].djId]:[];
    const newJobs=dates.map(date=>({
      id:uid(),projectNum:projNum(),venueId:venue.id,venueName:venue.name,city:"Oslo",
      venueAddress:venue.address||"",venueLogo:venue.logo||null,
      date,startTime:f.start,endTime:f.end,genres:gen,description:f.desc,
      hours,djFee,totalFee,
      targetMode:hasPQ?"priority":f.tgt,
      targetDjIds,
      priorityQueue:hasPQ?[...priorityQueue]:[],
      currentPriorityIdx:0,
      status:"open",interested:[],bookedDjId:null,bookedDjName:null,
      bookedAt:null,messages:[],invoiced:false,cancelRequest:null,
      ratings:{venueGiven:null,djGiven:null}
    }));
    onPost(newJobs);
  };

  const saveAsTpl=()=>{
    if(!tplName.trim())return;
    onSaveTemplate&&onSaveTemplate({id:uid(),name:tplName.trim(),start:f.start,end:f.end,genres:[...gen],desc:f.desc,tgt:f.tgt});
    setTplName("");setShowSaveTpl(false);
  };

  const dates=getDates();

  return(
    <div>
      <Sec>Ny jobb — {venue.name}</Sec>
      {templates.length>0&&<Card style={{marginBottom:8,padding:"10px 12px"}}>
        <div style={{fontWeight:600,fontSize:12,marginBottom:8,color:C.muted}}>⚡ MINE MALER — klikk for å fylle ut skjema</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {templates.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
              <button onClick={()=>loadTemplate(t)} style={{...btnBase,background:"transparent",border:"none",color:C.pop,padding:"6px 12px",fontSize:12,fontWeight:600}}>⚡ {t.name}</button>
              <button onClick={()=>onDeleteTemplate&&onDeleteTemplate(t.id)} style={{background:"none",border:"none",color:C.dim,cursor:"pointer",padding:"6px 8px",fontSize:12,borderLeft:`1px solid ${C.border}`}}>✕</button>
            </div>
          ))}
        </div>
      </Card>}
      <Card>
        <Lbl>Dato-modus</Lbl>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
          {[["single","Enkeltdato"],["multi","Flere datoer"],["recurring","Gjentakende"]].map(([v,l])=>(
            <label key={v} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",padding:"7px 10px",borderRadius:8,border:`1px solid ${f.dateMode===v?C.hi:C.border}`,background:f.dateMode===v?`${C.accent}20`:C.surface,fontSize:12,fontFamily:FF}}>
              <input type="radio" name="dm" value={v} checked={f.dateMode===v} onChange={()=>fv("dateMode",v)} style={{accentColor:C.accent}}/>{l}
            </label>
          ))}
        </div>
        {f.dateMode==="single"&&<LF lbl="Dato *" type="date" min={today()} onChange={v=>fv("singleDate",v)}/>}
        {f.dateMode==="multi"&&<div style={{marginBottom:12}}>
          <Lbl>Legg til datoer</Lbl>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <input type="date" min={today()} style={{...is,flex:1}} onChange={e=>fv("addDateVal",e.target.value)}/>
            <Btn onClick={addDate}>+ Legg til</Btn>
          </div>
          {f.multiDates.map(d=>(
            <div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:C.surface,borderRadius:7,marginBottom:4,fontSize:12}}>
              <span>{fmtDate(d)}</span>
              <button onClick={()=>removeDate(d)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14}}>✕</button>
            </div>
          ))}
        </div>}
        {f.dateMode==="recurring"&&<div style={{marginBottom:12}}>
          <Lbl>Ukedag</Lbl>
          <select style={{...is,marginBottom:10}} value={f.recurDow} onChange={e=>fv("recurDow",+e.target.value)}>
            {WEEKDAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
          </select>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><Lbl>Fra dato</Lbl><input type="date" min={today()} style={is} onChange={e=>fv("recurFrom",e.target.value)}/></div>
            <div style={{flex:1}}><Lbl>Til dato</Lbl><input type="date" style={is} onChange={e=>fv("recurTo",e.target.value)}/></div>
          </div>
        </div>}
        {dates.length>0&&<div style={{background:`${C.accent}16`,border:`1px solid ${C.accent}44`,borderRadius:8,padding:"7px 11px",marginBottom:12,fontSize:12}}>
          {dates.length} jobb{dates.length!==1?"er":""} vil opprettes {dates.length<=4&&": "+dates.slice(0,4).map(d=>new Date(d+"T12:00:00").toLocaleDateString("nb-NO",{day:"numeric",month:"short"})).join(", ")}{dates.length>4&&" (og flere…)"}
        </div>}
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <div style={{flex:1}}><Lbl>Fra *</Lbl><input type="time" style={is} value={f.start} onChange={e=>fv("start",e.target.value)}/></div>
          <div style={{flex:1}}><Lbl>Til *</Lbl><input type="time" style={is} value={f.end} onChange={e=>fv("end",e.target.value)}/></div>
        </div>
        {f.start&&f.end&&<FeePreview start={f.start} end={f.end}/>}
        <Lbl>Send til</Lbl>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
          {[["all","Alle passende DJer"],["favorites","Kun favoritter ❤️"],["priority","Prioritert liste 🥇"]].map(([v,lbl])=>(
            <label key={v} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",padding:"7px 10px",borderRadius:8,border:`1px solid ${f.tgt===v?C.hi:C.border}`,background:f.tgt===v?`${C.accent}20`:C.surface,fontSize:12,fontFamily:FF}}>
              <input type="radio" name="tgt" value={v} checked={f.tgt===v} onChange={()=>fv("tgt",v)} style={{accentColor:C.accent}}/>{lbl}
            </label>
          ))}
        </div>
        {f.tgt==="priority"&&<div style={{marginBottom:12}}>
          <div style={{background:`${C.accent}15`,border:`1px solid ${C.accent}33`,borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:C.muted}}>
            Velg opptil 5 DJer i prioritert rekkefølge. Forespørsel går til nr. 1 først — takker de nei, går den automatisk videre til nr. 2 osv.
          </div>
          <div style={{position:"relative",marginBottom:8}}>
            <input value={djSearch} onChange={e=>setDjSearch(e.target.value)} placeholder="Søk på artistnavn…"
              style={{...is,marginBottom:0,paddingLeft:28}} disabled={priorityQueue.length>=5}/>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:13}}>🔍</span>
          </div>
          {djSearch&&filteredDJs.length>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:8,overflow:"hidden"}}>
            {filteredDJs.map(dj=>(
              <div key={dj.id} onClick={()=>addToPriority(dj)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
                <Img src={dj.avatar} name={dj.name} size={28}/>
                <div style={{fontSize:12,fontWeight:600}}>{dj.name}</div>
                <div style={{marginLeft:"auto",color:C.accent,fontSize:11}}>+ Legg til</div>
              </div>
            ))}
          </div>}
          {priorityQueue.length>0&&<div style={{marginBottom:8}}>
            {priorityQueue.map((pq,i)=>(
              <div key={pq.djId} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.surface,borderRadius:8,marginBottom:5,border:`1px solid ${C.border}`}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:i===0?C.gold:C.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{i+1}</div>
                <Img src={pq.avatar} name={pq.djName} size={28}/>
                <div style={{flex:1,fontSize:12,fontWeight:600}}>{pq.djName}</div>
                <button onClick={()=>movePriority(i,-1)} disabled={i===0} style={{background:"none",border:"none",cursor:i===0?"default":"pointer",color:i===0?C.dim:C.muted,fontSize:14}}>↑</button>
                <button onClick={()=>movePriority(i,1)} disabled={i===priorityQueue.length-1} style={{background:"none",border:"none",cursor:i===priorityQueue.length-1?"default":"pointer",color:i===priorityQueue.length-1?C.dim:C.muted,fontSize:14}}>↓</button>
                <button onClick={()=>removePriority(pq.djId)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:14}}>✕</button>
              </div>
            ))}
          </div>}
          {priorityQueue.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"8px 0"}}>Ingen DJer valgt ennå — søk ovenfor</div>}
          {priorityQueue.length>=5&&<div style={{fontSize:11,color:C.gold,textAlign:"center"}}>Maks 5 DJer i listen</div>}
        </div>}
        <Lbl>Sjanger * ({gen.length} valgt)</Lbl>
        <div style={{border:`1px solid ${C.border}`,borderRadius:8,padding:8,maxHeight:160,overflowY:"auto",background:C.surface,marginBottom:12}}>
          {GENRES.map(g=><span key={g} style={chip(gen.includes(g))} onClick={()=>tg(g)}>{g}</span>)}
        </div>
        <LF lbl="Kommentar" multiline onChange={v=>fv("desc",v)}/>
        {err&&<Em msg={err}/>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={post}>Legg ut →</Btn>
          <button onClick={()=>setShowSaveTpl(p=>!p)} style={{...btnBase,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12}}>
            📋 {showSaveTpl?"Avbryt":"Lagre som mal"}
          </button>
        </div>
        {showSaveTpl&&<div style={{display:"flex",gap:8,marginTop:10}}>
          <input style={{...is,marginBottom:0,flex:1}} placeholder='Navn på malen, f.eks. "Standard fredag"' value={tplName} onChange={e=>setTplName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveAsTpl()}/>
          <Btn onClick={saveAsTpl}>Lagre</Btn>
        </div>}
      </Card>
    </div>
  );
}

function VenueJobCard({job,djs,jobs,onWantBook,onSendMsg,onViewDJProfile,onRateVenueSide,onReBook}) {
  const [chat,setChat]=useState(false);
  const isB=job.status==="booked"; const hasI=(job.interested||[]).length>0&&!isB;
  const isPast=job.date<today();

  // Check if a DJ has a conflicting booking at the same date/time
  const hasConflict = djId => (jobs||[]).some(j=>
    j.id!==job.id &&
    j.status==="booked" &&
    j.bookedDjId===djId &&
    j.date===job.date &&
    timesOverlap(j.startTime,j.endTime,job.startTime,job.endTime)
  );
  // Find where the conflict is (for display)
  const conflictJob = djId => (jobs||[]).find(j=>
    j.id!==job.id &&
    j.status==="booked" &&
    j.bookedDjId===djId &&
    j.date===job.date &&
    timesOverlap(j.startTime,j.endTime,job.startTime,job.endTime)
  );

  // Count conflicts in interested list
  const conflicts = (job.interested||[]).filter(i=>hasConflict(i.djId)).length;

  return(
    <Card style={{borderLeft:`3px solid ${isB?C.green:hasI?C.gold:C.dim}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Img src={job.venueLogo} name={job.venueName} size={36} style={{borderRadius:8,border:`1px solid ${C.border}`,flexShrink:0}}/>
          <div>
            <div style={{fontWeight:700}}>{job.venueName}</div>
            <div style={{color:C.muted,fontSize:11}}>{fmtDate(job.date)} · {job.startTime}–{job.endTime} · {job.hours}t</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {(isB||isPast)&&onReBook&&<button onClick={onReBook} style={{...btnBase,background:`${C.accent}20`,border:`1px solid ${C.accent}44`,color:C.pop,padding:"3px 9px",fontSize:11}}>↩ Book igjen</button>}
          <Bdg col={isB?C.green:hasI?C.gold:C.dim} sm>{isB?"Booket":hasI?job.interested.length+" svar":"Venter"}</Bdg>
        </div>
      </div>
      {job.targetMode==="favorites"&&<div style={{fontSize:11,color:C.pink,marginBottom:6}}>❤️ Kun til favoritter</div>}
      <div style={{marginBottom:8}}>{(job.genres||[]).map(g=><span key={g} style={chip(true)}>{g}</span>)}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontWeight:800,fontSize:14,color:C.pop}}>{fmtNOK(job.totalFee||0)}</div><div style={{fontSize:10,color:C.dim}}>{job.hours}t × 1000 + 1000 kr påslag</div></div>
        {isB&&<div style={{fontSize:12,color:C.muted}}>🎧 {job.bookedDjName}</div>}
      </div>
      {job.description&&<div style={{marginTop:7,paddingTop:7,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>{job.description}</div>}
      {job.cancelRequest&&!job.cancelRequest.rejected&&isB&&<div style={{marginTop:8,padding:"8px 10px",background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:8}}>
        <div style={{color:C.red,fontWeight:600,fontSize:12,marginBottom:4}}>⚠️ {job.bookedDjName} ønsker å avlyse</div>
        <div style={{color:C.muted,fontSize:12,marginBottom:6}}>Grunn: {job.cancelRequest.reason}</div>
      </div>}
      {hasI&&(
        <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:12,color:C.gold}}>👇 Velg artist</div>
            {conflicts>0&&<div style={{fontSize:11,color:C.red}}>⚠️ {conflicts} har dobbelbooking</div>}
          </div>
          {job.interested.map(int=>{
            const dj=djs.find(d=>d.id===int.djId);
            const conflict=hasConflict(int.djId);
            const cJob=conflict?conflictJob(int.djId):null;
            return(
              <div key={int.djId} style={{padding:"10px 12px",background:conflict?`${C.red}10`:C.surface,borderRadius:10,marginBottom:8,border:`1px solid ${conflict?C.red+"44":C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{position:"relative",flexShrink:0}}>
                    <Img src={int.avatar||dj?.avatar} name={int.djName} size={64} style={{border:`2px solid ${conflict?C.red:C.border}`}}/>
                    {conflict&&<div style={{position:"absolute",bottom:-4,right:-4,background:C.red,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>⛔</div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14}}>{int.djName}</div>
                    {dj?.artistType==="instrumentalist"&&<Bdg col={C.pink} sm style={{marginBottom:4}}>🎸 {dj.instrument}</Bdg>}
                    {dj?.phone&&<div style={{color:C.muted,fontSize:12}}>{dj.phone}</div>}
                    {dj?.genres?.length>0&&<div style={{marginTop:3}}>{dj.genres.slice(0,3).map(g=><span key={g} style={{...chip(true),fontSize:10,padding:"2px 7px"}}>{g}</span>)}</div>}
                    {conflict&&cJob&&(
                      <div style={{marginTop:4}}>
                        <span style={{fontSize:10,background:`${C.red}20`,color:C.red,borderRadius:5,padding:"2px 7px",fontWeight:600}}>
                          ⛔ Opptatt {cJob.startTime}–{cJob.endTime} på {cJob.venueName}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                    <button onClick={()=>onViewDJProfile&&onViewDJProfile(int.djId)} style={{...btnBase,background:C.card,border:`1px solid ${C.border}`,color:C.muted,padding:"5px 10px",fontSize:11}}>Se profil</button>
                    {conflict
                      ?<div style={{...btnBase,background:`${C.red}20`,border:`1px solid ${C.red}44`,color:C.red,padding:"5px 10px",fontSize:11,cursor:"default",textAlign:"center"}}>Opptatt</div>
                      :<Btn green onClick={()=>onWantBook(int.djId,int.djName)}>Velg ✓</Btn>
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {isB&&isPast&&!job.ratings?.venueGiven&&(
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <Lbl>Gi {job.bookedDjName} en rating</Lbl>
          <RatingPicker onRate={val=>onRateVenueSide&&onRateVenueSide(val)}/>
        </div>
      )}
      {isB&&job.ratings?.venueGiven&&<div style={{marginTop:6,fontSize:12,color:C.gold}}>Din rating: {stars(job.ratings.venueGiven)}</div>}
      {isB&&(
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <button style={{...btnBase,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"5px 10px",fontSize:11}} onClick={()=>setChat(p=>!p)}>
            💬 {chat?"Skjul":"Meldinger"}{(job.messages?.length||0)>0?` (${job.messages.length})`:""}
          </button>
          {chat&&<ChatPanel messages={job.messages||[]} onSend={onSendMsg}/>}
        </div>
      )}
    </Card>
  );
}

function exportToCSV(jobs) {
  const rows = [
    ["Prosjektnummer","Utested","Dato","Fra","Til","Timer","Sjanger","DJ/Artist","Status","Fakturert"],
    ...(jobs||[]).map(j=>[
      j.projectNum||"",
      j.venueName||"",
      j.date||"",
      j.startTime||"",
      j.endTime||"",
      j.hours||"",
      (j.genres||[]).join(", "),
      j.bookedDjName||"",
      j.status==="booked"?"Booket":"Åpen",
      j.invoiced?"Ja":"Nei"
    ])
  ];
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURIComponent(csv);
  a.download = `klubbdjs-kalender-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function DJAvailability({djId, jobs}) {
  const upcoming = (jobs||[])
    .filter(j => j.bookedDjId===djId && j.status==="booked" && j.date>=today())
    .sort((a,b) => a.date.localeCompare(b.date));
  if (upcoming.length===0) return (
    <div style={{display:"inline-flex",alignItems:"center",gap:4,background:`${C.green}20`,border:`1px solid ${C.green}44`,borderRadius:6,padding:"3px 9px",fontSize:11,color:C.green,marginBottom:8}}>
      ✓ Ingen kjente bookinger fremover
    </div>
  );
  const next = upcoming[0];
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:4,background:`${C.gold}18`,border:`1px solid ${C.gold}44`,borderRadius:6,padding:"3px 9px",fontSize:11,color:C.gold}}>
        📅 Neste booking: {new Date(next.date+"T12:00:00").toLocaleDateString("nb-NO",{day:"numeric",month:"short"})} {next.startTime}–{next.endTime} · {next.venueName}
      </div>
      {upcoming.length>1&&<div style={{fontSize:10,color:C.muted,marginTop:3}}>{upcoming.length} kommende bookinger totalt</div>}
    </div>
  );
}

function ReBookModal({job,venue,onBook,onClose}) {
  const [date,setDate]=useState("");
  const [err,setErr]=useState("");
  const submit=()=>{
    if(!date)return setErr("Velg dato");
    const{hours,djFee,totalFee}=calcFee(job.startTime,job.endTime);
    const newJob={...job,id:uid(),projectNum:projNum(),date,status:"open",interested:[],bookedDjId:null,bookedDjName:null,bookedAt:null,messages:[],invoiced:false,cancelRequest:null,ratings:{venueGiven:null,djGiven:null}};
    onBook(newJob);
  };
  return(
    <Modal title="↩ Book igjen — velg ny dato" onClose={onClose}>
      <div style={{background:C.surface,borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12}}>
        <div style={{fontWeight:600,marginBottom:4}}>{job.venueName}</div>
        <div style={{color:C.muted}}>Tid: {job.startTime}–{job.endTime} · {job.hours}t</div>
        <div style={{color:C.muted}}>Sjanger: {(job.genres||[]).join(", ")}</div>
        <div style={{color:C.muted}}>Sendes til: {job.targetMode==="favorites"?"❤️ Favoritter":"Alle passende DJer"}</div>
        {job.description&&<div style={{color:C.muted,marginTop:4}}>Kommentar: {job.description}</div>}
      </div>
      <LF lbl="Ny dato *" type="date" min={today()} onChange={v=>setDate(v)}/>
      {err&&<Em msg={err}/>}
      <Row><Btn onClick={submit}>Legg ut →</Btn><Btn outline onClick={onClose}>Avbryt</Btn></Row>
    </Modal>
  );
}

function DJBrowse({djs,venue,jobs,onToggleFav,onViewProfile,onBookDirect}) {
  const [idx,setIdx]=useState(0);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("");
  const [favOnly,setFavOnly]=useState(false);
  const [typeFilter,setTypeFilter]=useState("all");
  const favIds=venue?.favorites||[];
  let list=djs;
  if(search)list=list.filter(d=>d.name.toLowerCase().includes(search.toLowerCase()));
  if(filter)list=list.filter(d=>(d.genres||[]).includes(filter));
  if(favOnly)list=list.filter(d=>favIds.includes(d.id));
  if(typeFilter!=="all")list=list.filter(d=>d.artistType===typeFilter);
  useEffect(()=>setIdx(0),[search,filter,favOnly,typeFilter]);
  const dj=list[idx]||null;
  const rating=dj?avgRating(dj.id,jobs):null;

  return(
    <div>
      <Sec>Finn Artist — {APP.city}</Sec>
      {/* Name search */}
      <div style={{position:"relative",marginBottom:8}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:14,pointerEvents:"none"}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søk på artistnavn…"
          style={{...is,marginBottom:0,paddingLeft:32}}/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...is,flex:"0 0 auto",width:"auto"}}>
          <option value="all">Alle typer</option><option value="dj">🎧 DJer</option><option value="instrumentalist">🎸 Instrumentalister</option>
        </select>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{...is,flex:1}}>
          <option value="">Alle sjangrene ({list.length} artister)</option>
          {GENRES.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={()=>setFavOnly(p=>!p)} style={{...btnBase,background:favOnly?`${C.red}25`:"transparent",border:`1px solid ${favOnly?C.red:C.accent}`,color:favOnly?C.red:C.pop,padding:"9px 12px",whiteSpace:"nowrap"}}>❤️ {favOnly?`Fav (${favIds.length})`:"Alle"}</button>
      </div>
      {list.length===0&&<Empty text="Ingen artister matcher"/>}
      {dj&&(
        <div style={{...cs,maxWidth:440,margin:"0 auto",padding:0,overflow:"hidden",boxShadow:`0 16px 48px ${C.accent}33`}}>
          <div style={{position:"relative",height:260,background:`linear-gradient(160deg,${C.accent}55,${C.surface})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Img key={dj.id} src={dj.avatar} name={dj.name} size={160} style={{boxShadow:`0 8px 32px ${C.accent}66`}}/>
            <button onClick={()=>onToggleFav(dj.id)} style={{position:"absolute",top:12,left:12,background:"none",border:"none",cursor:"pointer",fontSize:28,filter:"drop-shadow(0 2px 6px #000a)"}}>
              {favIds.includes(dj.id)?"❤️":"🤍"}
            </button>
            <Bdg col={C.dim} sm style={{position:"absolute",top:14,right:12}}>{idx+1}/{list.length}</Bdg>
            {dj.artistType==="instrumentalist"&&<Bdg col={C.pink} sm style={{position:"absolute",bottom:12,left:12}}>🎸 {dj.instrument}</Bdg>}
            {favIds.includes(dj.id)&&<Bdg col={C.red} sm style={{position:"absolute",bottom:12,right:12}}>❤️ Favoritt</Bdg>}
          </div>
          <div style={{padding:"14px 20px 20px"}}>
            <div style={{fontWeight:800,fontSize:20,marginBottom:2}}>{dj.name}</div>
            {rating&&<div style={{color:C.gold,fontSize:12,marginBottom:4}}>{"★".repeat(Math.round(parseFloat(rating)))}{"☆".repeat(5-Math.round(parseFloat(rating)))} {rating} / 5</div>}
            {dj.phone&&<div style={{color:C.muted,fontSize:12,marginBottom:4}}>{dj.phone}</div>}
            {dj.instagram&&<div style={{marginBottom:8}}><a href={`https://instagram.com/${dj.instagram}`} target="_blank" rel="noopener noreferrer" style={{color:C.pink,fontSize:12,textDecoration:"none"}}>📸 @{dj.instagram}</a></div>}
            {dj.areas?.length>0&&<div style={{fontSize:11,color:C.muted,marginBottom:8}}>📍 {dj.areas.join(" · ")}</div>}
            {dj.bio&&<div style={{color:C.muted,fontSize:13,lineHeight:1.55,marginBottom:12,fontStyle:"italic"}}>"{dj.bio}"</div>}
            <div style={{marginBottom:14}}>{(dj.genres||[]).map(g=><span key={g} style={chip(true)}>{g}</span>)}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              <Btn outline style={{flex:1,opacity:idx===0?.25:1}} onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0}>← Forrige</Btn>
              <button onClick={()=>onToggleFav(dj.id)} style={{...btnBase,border:`1px solid ${favIds.includes(dj.id)?C.red:C.accent}`,color:favIds.includes(dj.id)?C.red:C.pop,background:favIds.includes(dj.id)?`${C.red}20`:"transparent"}}>
                {favIds.includes(dj.id)?"💔 Fjern":"❤️ Favoritt"}
              </button>
              <Btn outline style={{flex:1,opacity:idx===list.length-1?.25:1}} onClick={()=>setIdx(i=>Math.min(list.length-1,i+1))} disabled={idx===list.length-1}>Neste →</Btn>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn outline full onClick={()=>onViewProfile&&onViewProfile(dj)}>Se full profil</Btn>
              <Btn full style={{background:`linear-gradient(135deg,${C.green},#059669)`,border:"none",color:"#fff"}} onClick={()=>onBookDirect&&onBookDirect(dj)}>Book direkte</Btn>
            </div>
          </div>
        </div>
      )}
      {favIds.length>0&&<div style={{marginTop:16}}>
        <div style={{fontWeight:700,fontSize:12,marginBottom:8,color:C.muted}}>❤️ Mine favoritter ({favIds.length})</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {favIds.map(id=>{const d=djs.find(x=>x.id===id);if(!d)return null;return(
            <div key={id} style={{display:"flex",alignItems:"center",gap:7,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px"}}>
              <Img src={d.avatar} name={d.name} size={28}/><div style={{fontSize:12,fontWeight:600}}>{d.name}</div>
              <button onClick={()=>onToggleFav(id)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:14,padding:"0 2px"}}>✕</button>
            </div>
          );})}
        </div>
      </div>}
    </div>
  );
}

function DJProfileModal({dj,jobs,venue,onToggleFav,onBookDirect,onClose}) {
  const rating = avgRating(dj.id, jobs);
  const favIds = venue?.favorites || [];
  const canFav = !!venue && !!onToggleFav;
  const canBook = !!onBookDirect;
  return (
    <Modal title="Artist-profil" onClose={onClose}>
      <div style={{textAlign:"center",marginBottom:14}}>
        <Img src={dj.avatar} name={dj.name} size={96} style={{display:"block",margin:"0 auto 10px",border:`3px solid ${C.accent}`}}/>
        <div style={{fontWeight:800,fontSize:18}}>{dj.name}</div>
        {dj.artistType==="instrumentalist"&&<Bdg col={C.pink} sm>🎸 {dj.instrument}</Bdg>}
        {rating&&<div style={{color:C.gold,marginTop:4}}>{"★".repeat(Math.round(parseFloat(rating)))}{"☆".repeat(5-Math.round(parseFloat(rating)))} {rating} / 5</div>}
      </div>
      {dj.areas?.length>0&&<div style={{color:C.muted,fontSize:12,marginBottom:6}}>📍 {dj.areas.join(" · ")}</div>}
      {dj.phone&&<div style={{color:C.muted,fontSize:13,marginBottom:4}}>📞 {dj.phone}</div>}
      {dj.instagram&&<div style={{marginBottom:8}}><a href={`https://instagram.com/${dj.instagram}`} target="_blank" rel="noopener noreferrer" style={{color:C.pink,fontSize:13,textDecoration:"none"}}>📸 @{dj.instagram}</a></div>}
      {dj.bio&&<div style={{color:C.muted,fontSize:13,lineHeight:1.6,marginBottom:12,fontStyle:"italic"}}>"{dj.bio}"</div>}
      <div style={{marginBottom:16}}>{(dj.genres||[]).map(g=><span key={g} style={chip(true)}>{g}</span>)}</div>
      <Row>
        {canFav&&<button onClick={()=>onToggleFav(dj.id)} style={{...btnBase,border:`1px solid ${favIds.includes(dj.id)?C.red:C.accent}`,color:favIds.includes(dj.id)?C.red:C.pop,background:favIds.includes(dj.id)?`${C.red}20`:"transparent"}}>
          {favIds.includes(dj.id)?"💔 Fjern favoritt":"❤️ Legg til favoritt"}
        </button>}
        {canBook&&<Btn green onClick={onBookDirect}>Book direkte</Btn>}
        {!canBook&&!canFav&&<Btn outline onClick={onClose}>Lukk</Btn>}
      </Row>
    </Modal>
  );
}

function BookFromProfileModal({dj,venue,jobs,onBook,onClose}) {
  const [f,setF]=useState({date:"",start:"",end:""});
  const [gen,setGen]=useState(dj.genres?.slice(0,2)||[]);
  const [err,setErr]=useState("");
  const fv=(k,v)=>setF(p=>({...p,[k]:v}));
  const tg=g=>setGen(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);

  // Live conflict check as user fills in date/time
  const conflict = f.date&&f.start&&f.end
    ? jobs.find(j=>j.status==="booked"&&j.bookedDjId===dj.id&&j.date===f.date&&timesOverlap(j.startTime,j.endTime,f.start,f.end))
    : null;

  const submit=()=>{
    if(!f.date||!f.start||!f.end)return setErr("Fyll ut dato og tider");
    if(gen.length===0)return setErr("Velg sjanger");
    if(conflict)return setErr(`${dj.name} er allerede booket ${conflict.startTime}–${conflict.endTime} på ${conflict.venueName} denne datoen.`);
    const{hours,djFee,totalFee}=calcFee(f.start,f.end);
    const job={id:uid(),projectNum:projNum(),venueId:venue.id,venueName:venue.name,city:"Oslo",venueAddress:venue.address||"",venueLogo:venue.logo||null,date:f.date,startTime:f.start,endTime:f.end,genres:gen,description:"",hours,djFee,totalFee,targetMode:"all",targetDjIds:[],status:"open",interested:[],bookedDjId:null,bookedDjName:null,bookedAt:null,messages:[],invoiced:false,cancelRequest:null,ratings:{venueGiven:null,djGiven:null}};
    onBook(job,dj.id,dj.name);
  };
  return(
    <Modal title={`Book ${dj.name} direkte`} onClose={onClose}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"8px 10px",background:C.surface,borderRadius:8}}>
        <Img src={dj.avatar} name={dj.name} size={44}/><div><div style={{fontWeight:700}}>{dj.name}</div>{dj.phone&&<div style={{color:C.muted,fontSize:12}}>{dj.phone}</div>}</div>
      </div>
      <LF lbl="Dato *" type="date" min={today()} onChange={v=>fv("date",v)}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><LF lbl="Fra *" type="time" onChange={v=>fv("start",v)}/></div><div style={{flex:1}}><LF lbl="Til *" type="time" onChange={v=>fv("end",v)}/></div></div>
      {/* Live conflict warning */}
      {conflict&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12}}>
        <div style={{fontWeight:700,color:C.red,marginBottom:2}}>⛔ Opptatt denne perioden</div>
        <div style={{color:C.muted}}>{dj.name} er allerede booket {conflict.startTime}–{conflict.endTime} på <strong>{conflict.venueName}</strong> denne datoen.</div>
      </div>}
      {f.start&&f.end&&!conflict&&<FeePreview start={f.start} end={f.end}/>}
      <Lbl>Sjanger * ({gen.length} valgt)</Lbl>
      <div style={{border:`1px solid ${C.border}`,borderRadius:8,padding:8,maxHeight:140,overflowY:"auto",background:C.surface,marginBottom:12}}>
        {GENRES.map(g=><span key={g} style={chip(gen.includes(g))} onClick={()=>tg(g)}>{g}</span>)}
      </div>
      {err&&<Em msg={err}/>}
      <Row>
        <Btn onClick={submit} style={{opacity:conflict?0.4:1}}>Neste: Kontrakt →</Btn>
        <Btn outline onClick={onClose}>Avbryt</Btn>
      </Row>
    </Modal>
  );
}

function VenueSettings({user,venues,onUpdateUser,onVenues,onPending}) {
  const [joinCode,  setJoinCode]  = useState("");
  const [joinErr,   setJoinErr]   = useState("");
  const [joinOk,    setJoinOk]    = useState("");
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState("");
  const [newAddr,   setNewAddr]   = useState("");
  const [createErr, setCreateErr] = useState("");
  const [pendingOk, setPendingOk] = useState("");

  // Submit new venue for XIID admin approval
  const submitVenuePending = () => {
    if (!newName.trim()) return setCreateErr("Stedsnavn er påkrevd");
    const venueId = uid();
    onPending({
      id: uid(),
      type: "new-venue",
      createdAt: new Date().toISOString(),
      userId:   user.id,
      userName: user.name,
      venueData: {
        id: venueId,
        name: newName.trim(),
        city: APP.city,
        address: newAddr.trim(),
        ownerIds: [user.id],
        favorites: [],
        templates: [],
      }
    });
    setNewName(""); setNewAddr(""); setCreating(false); setCreateErr("");
    setPendingOk(`Søknad for «${newName.trim()}» er sendt til XIID for godkjenning.`);
    setTimeout(() => setPendingOk(""), 6000);
  };

  const joinVenue = () => {
    setJoinErr(""); setJoinOk("");
    const ve = venues.find(v => v.id === joinCode.trim());
    if (!ve) return setJoinErr("Fant ikke utested med den ID-en. Sjekk at koden er riktig.");
    if ((user.venueIds||[]).includes(ve.id)) return setJoinErr("Du er allerede koblet til dette utestedet.");
    onUpdateUser({ ...user, venueIds: [...(user.venueIds||[]), ve.id] });
    onVenues(vs => vs.map(v => v.id===ve.id ? {...v, ownerIds:[...v.ownerIds, user.id]} : v));
    setJoinCode("");
    setJoinOk(`Du er nå koblet til ${ve.name}!`);
    setTimeout(() => setJoinOk(""), 4000);
  };

  return (
    <div>
      <Sec>Innstillinger</Sec>
      <ManualButton role="venue"/>
      <NotifPrefs user={user} onSave={onUpdateUser}/>
      {/* Current venues */}
      <Card>
        <div style={{fontWeight:700,marginBottom:12}}>Dine utesteder ({(user.venueIds||[]).length})</div>
        {(user.venueIds||[]).map(id=>venues.find(v=>v.id===id)).filter(Boolean).map(ve=>(
          <div key={ve.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
                {/* Logo */}
                <div style={{position:"relative",flexShrink:0}}>
                  <Img src={ve.logo} name={ve.name} size={52} style={{borderRadius:10,border:`2px solid ${C.border}`}}/>
                  <label style={{position:"absolute",bottom:-4,right:-4,background:C.accent,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10}}>
                    📷
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                      const f=e.target.files?.[0]; if(!f)return;
                      const b=await toB64(f);
                      onVenues(vs=>vs.map(v=>v.id===ve.id?{...v,logo:b}:v));
                    }}/>
                  </label>
                </div>
                <div>
                  <div style={{fontWeight:600}}>{ve.name}</div>
                  <div style={{color:C.muted,fontSize:11}}>📍 {ve.city}{ve.address&&" · "+ve.address}</div>
                  <MapsLinks address={ve.address} city={ve.city}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{color:C.dim,fontSize:10,fontWeight:600,marginBottom:2}}>UTESTED-ID</div>
                <code style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 8px",fontSize:11,color:C.pop}}>{ve.id}</code>
              </div>
            </div>
          </div>
        ))}
        {(user.venueIds||[]).length===0&&<div style={{color:C.muted,fontSize:13}}>Ingen utesteder koblet til kontoen.</div>}
      </Card>

      {/* Request new venue (goes to admin for approval) */}
      <Card>
        <div style={{fontWeight:700,marginBottom:4}}>🏢 Legg til nytt utested</div>
        <div style={{color:C.muted,fontSize:12,marginBottom:12,lineHeight:1.5}}>
          Stedet må godkjennes av <strong style={{color:C.pop}}>XIID</strong> før det opprettes.
          Finnes stedet allerede i systemet? Bruk <strong>Utested-ID</strong> i seksjonen under.
        </div>
        {pendingOk&&<div style={{color:C.green,fontSize:12,marginBottom:10,padding:"7px 10px",background:`${C.green}15`,borderRadius:8}}>📬 {pendingOk}</div>}
        {!creating
          ?<button onClick={()=>setCreating(true)}
              style={{...btnBase,background:`linear-gradient(135deg,${C.accent},${C.hi})`,color:"#fff",border:"none",fontSize:13}}>
              + Send søknad til XIID
            </button>
          :<div>
              <div style={{marginBottom:10}}>
                <Lbl>Stedsnavn *</Lbl>
                <input style={{...is,marginBottom:0}} placeholder="f.eks. Gamla" value={newName} onChange={e=>setNewName(e.target.value)}/>
              </div>
              <div style={{marginBottom:12}}>
                <Lbl>Adresse</Lbl>
                <input style={{...is,marginBottom:0}} placeholder="f.eks. Møllergata 2, 0179 Oslo" value={newAddr} onChange={e=>setNewAddr(e.target.value)}/>
              </div>
              <div style={{background:`${C.gold}12`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"7px 11px",marginBottom:12,fontSize:12,color:C.gold}}>
                ⏳ Søknaden sendes til XIID og må godkjennes før stedet opprettes.
              </div>
              {createErr&&<div style={{color:C.red,fontSize:12,marginBottom:8,padding:"5px 9px",background:`${C.red}15`,borderRadius:7}}>{createErr}</div>}
              <Row>
                <button onClick={submitVenuePending} style={{...btnBase,background:`linear-gradient(135deg,${C.accent},${C.hi})`,color:"#fff",border:"none",fontSize:13}}>Send søknad</button>
                <button onClick={()=>{setCreating(false);setCreateErr("");}} style={{...btnBase,background:"transparent",color:C.muted,border:`1px solid ${C.border}`,fontSize:13}}>Avbryt</button>
              </Row>
            </div>
        }
      </Card>

      {/* Join existing venue by ID */}
      <Card>
        <div style={{fontWeight:700,marginBottom:4}}>🔗 Utested finnes allerede i systemet</div>
        <div style={{color:C.muted,fontSize:12,marginBottom:12,lineHeight:1.5}}>
          Får du Utested-ID fra en kollega eller fra XIID, limer du den inn her for å koble deg til stedet umiddelbart — ingen godkjenning nødvendig.
        </div>
        <div style={{display:"flex",gap:8,marginBottom:4}}>
          <input style={{...is,marginBottom:0,flex:1}} placeholder="Lim inn Utested-ID…" value={joinCode} onChange={e=>setJoinCode(e.target.value)}/>
          <button onClick={joinVenue} style={{...btnBase,background:`linear-gradient(135deg,${C.green},#059669)`,color:"#fff",border:"none",whiteSpace:"nowrap",fontSize:13}}>Koble til</button>
        </div>
        {joinErr&&<div style={{color:C.red,fontSize:12,marginTop:6,padding:"5px 9px",background:`${C.red}15`,borderRadius:7}}>{joinErr}</div>}
        {joinOk &&<div style={{color:C.green,fontSize:12,marginTop:6,padding:"5px 9px",background:`${C.green}15`,borderRadius:7}}>✓ {joinOk}</div>}
      </Card>
      <NotifPrefs user={user} onSave={onUpdateUser}/>
      <ChangePassword user={user} onSave={onUpdateUser}/>
    </div>
  );
}

function NotifPrefs({user, onSave}) {
  const appOn   = user.notifApp   !== false; // default true
  const emailOn = user.notifEmail === true;  // default false (opt-in)
  const toggle  = key => onSave({...user, [key]: !user[key]});
  return (
    <Card style={{marginBottom:10}}>
      <div style={{fontWeight:700,marginBottom:12}}>🔔 Varslingsinnstillinger</div>
      {[
        { key:"notifApp",   label:"Varsel i appen",  sub:"Bjelle-ikon i toppen ved nye hendelser", on:appOn },
        { key:"notifEmail", label:"E-postvarsling",  sub:"Åpner e-postklienten din ved nye hendelser", on:emailOn },
      ].map(({key,label,sub,on})=>(
        <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
          <div>
            <div style={{fontWeight:600,fontSize:13}}>{label}</div>
            <div style={{color:C.muted,fontSize:11}}>{sub}</div>
          </div>
          <button onClick={()=>toggle(key)}
            style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",
              background:on?C.green:C.dim,position:"relative",transition:"background .2s",flexShrink:0}}>
            <span style={{position:"absolute",top:2,left:on?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
          </button>
        </div>
      ))}
    </Card>
  );
}

function ChangePassword({user, onSave}) {
  const [cur,  setCur]  = useState("");
  const [p1,   setP1]   = useState("");
  const [p2,   setP2]   = useState("");
  const [err,  setErr]  = useState("");
  const [ok,   setOk]   = useState("");

  const save = () => {
    setErr(""); setOk("");
    if (!cur)  return setErr("Skriv inn nåværende passord");
    if (user.password && cur !== user.password) return setErr("Nåværende passord er feil");
    if (!p1 || p1.length < 4) return setErr("Nytt passord må være minst 4 tegn");
    if (p1 !== p2) return setErr("Passordene er ikke like");
    onSave({...user, password: p1});
    setCur(""); setP1(""); setP2("");
    setOk("Passord oppdatert ✓");
    setTimeout(() => setOk(""), 4000);
  };

  return (
    <Card>
      <div style={{fontWeight:700,marginBottom:12}}>🔑 Endre passord</div>
      <PassField lbl="Nåværende passord" value={cur} onChange={setCur}/>
      <PassField lbl="Nytt passord" value={p1} onChange={setP1} placeholder="Min. 4 tegn"/>
      <PassField lbl="Gjenta nytt passord" value={p2} onChange={setP2} placeholder="Skriv passordet igjen"/>
      {err && <div style={{color:C.red,fontSize:12,marginBottom:8,padding:"6px 10px",background:`${C.red}15`,borderRadius:7}}>{err}</div>}
      {ok  && <div style={{color:C.green,fontSize:12,marginBottom:8,padding:"6px 10px",background:`${C.green}15`,borderRadius:7}}>{ok}</div>}
      <button onClick={save} style={{...btnBase,background:`linear-gradient(135deg,${C.accent},${C.hi})`,color:"#fff",border:"none",fontSize:13}}>Lagre nytt passord</button>
    </Card>
  );
}

/* ─── DJ VIEW ────────────────────────────────────────────────────────────── */
function DJView({user,jobs,onJobs,onUpdateUser,addNotif,myNotifs}) {
  const [tab,setTab]=useState("cal");
  const [genres,setGenres]=useState(user.genres||[]);
  const [areas,  setAreas] = useState(user.areas||[]);
  const [bio,setBio]=useState(user.bio||"");
  const [phone,setPhone]=useState(user.phone||"");
  const [insta,setInsta]=useState(user.instagram||"");
  const [saveOk,setSaveOk]=useState("");
  const [uploading,setUploading]=useState(false);
  const [busy,setBusy]=useState(null);
  const [cancelModal,setCancelModal]=useState(null);
  const tg=g=>setGenres(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);
  const myG=user.genres||[];

  const visJobs=jobs.filter(j=>{
    if(j.status!=="open"||j.city!=="Oslo")return false;
    if(!(j.genres||[]).some(g=>myG.includes(g)))return false;
    if(j.targetMode==="favorites")return(j.targetDjIds||[]).includes(user.id);
    if(j.targetMode==="priority"){
      // Only current priority DJ sees it
      const pq=j.priorityQueue||[];
      const idx=j.currentPriorityIdx||0;
      return pq[idx]?.djId===user.id;
    }
    return true;
  }).sort((a,b)=>a.date.localeCompare(b.date));

  const myInt=jobs.filter(j=>j.status==="open"&&(j.interested||[]).some(i=>i.djId===user.id));
  const myBooks=jobs.filter(j=>j.bookedDjId===user.id).sort((a,b)=>a.date.localeCompare(b.date));
  const totFee=myBooks.reduce((s,j)=>s+(j.djFee||0),0);
  const hasInt=jid=>(jobs.find(j=>j.id===jid)?.interested||[]).some(i=>i.djId===user.id);

  const decline=jid=>{
    onJobs(js=>js.map(j=>{
      if(j.id!==jid||j.targetMode!=="priority")return j;
      const nextIdx=(j.currentPriorityIdx||0)+1;
      const pq=j.priorityQueue||[];
      if(nextIdx>=pq.length){
        // All declined — open to everyone
        return{...j,targetMode:"all",targetDjIds:[],currentPriorityIdx:0};
      }
      return{...j,currentPriorityIdx:nextIdx,targetDjIds:[pq[nextIdx].djId]};
    }));
  };

  const express=jid=>{
    if(hasInt(jid)||busy)return;
    const job=jobs.find(j=>j.id===jid);
    if(!job||job.status!=="open")return;
    setBusy(jid);
    onJobs(js=>js.map(j=>j.id===jid?{...j,interested:[...(j.interested||[]),{djId:user.id,djName:user.name,avatar:user.avatar}]}:j));
    // In-app notification to venue (always)
    addNotif?.(job.venueId, `${user.name} har meldt interesse – ${job.venueName} ${fmtDate(job.date)} ${job.startTime}–${job.endTime}`);
    setBusy(null); setTab("interest");
  };

  const sendMsg=(jid,text)=>{if(!text.trim())return;const msg={id:uid(),fromId:user.id,fromName:user.name,fromRole:"dj",text:text.trim(),ts:nowTS()};onJobs(js=>js.map(j=>j.id===jid?{...j,messages:[...(j.messages||[]),msg]}:j));};
  const submitCancel=(jobId,reason,type)=>{onJobs(js=>js.map(j=>j.id===jobId?{...j,cancelRequest:{djId:user.id,djName:user.name,reason,type,createdAt:new Date().toISOString()}}:j));setCancelModal(null);};
  const rateVenue=(jobId,val)=>onJobs(js=>js.map(j=>j.id===jobId?{...j,ratings:{...j.ratings,djGiven:val}}:j));
  const handlePhoto=async e=>{const f=e.target.files?.[0];if(!f)return;setUploading(true);const b64=await toB64(f);onUpdateUser({...user,avatar:b64});setUploading(false);};
  const saveProfile=()=>{onUpdateUser({...user,genres,areas,bio,phone,instagram:insta});setSaveOk("Profil lagret!");setTimeout(()=>setSaveOk(""),3000);};

  return(
    <Page>
      {cancelModal&&<CancelModal jobId={cancelModal} onSubmit={submitCancel} onClose={()=>setCancelModal(null)}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        <SC label="Ledige" value={visJobs.length} color={C.gold}/>
        <SC label="Interesse" value={myInt.length} color={C.pop}/>
        <SC label="Bookinger" value={myBooks.length} color={C.green}/>
      </div>
      <Tabs tabs={[["cal","Kalender"],["feed","Ledige"],["interest","Interesse"],["booked","Bookinger"],["profil","Innstillinger"]]} active={tab} onChange={setTab}
        badge={{"feed":visJobs.length>0?visJobs.length:0,"interest":myInt.length>0?myInt.length:0}}/>

      {tab==="cal"&&<CalGrid jobs={myBooks} showExport/>}

      {tab==="feed"&&<>
        <Sec>Ledige jobber i {APP.city}</Sec>
        {myG.length===0&&<div style={{background:`${C.gold}18`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"9px 13px",marginBottom:12,color:C.gold}}>⚠️ Gå til Profil og velg sjangrene dine</div>}
        {visJobs.length===0&&myG.length>0&&<Empty text="Ingen ledige jobber matcher din profil akkurat nå"/>}
        {visJobs.map(j=>{
          const sent=hasInt(j.id);
          const conflict=hasDJConflict(user.id,{...j,id:j.id},jobs);
          return(
            <JobCard key={j.id} job={j} isDJ>
              <div style={{textAlign:"right"}}>
                {j.targetMode==="favorites"&&<div style={{fontSize:10,color:C.pink,marginBottom:4}}>❤️ Favorittjobb</div>}
                {j.targetMode==="priority"&&<div style={{fontSize:10,color:C.gold,marginBottom:4}}>🥇 Du er prioritert</div>}
                {conflict
                  ?<div style={{background:`${C.red}20`,border:`1px solid ${C.red}44`,borderRadius:7,padding:"6px 10px",fontSize:12,color:C.red}}>⛔ Du er opptatt i dette tidspunktet</div>
                  :<div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                    {j.targetMode==="priority"&&!sent&&<button onClick={()=>decline(j.id)}
                      style={{...btnBase,background:`${C.red}20`,border:`1px solid ${C.red}44`,color:C.red,padding:"8px 12px",fontSize:12}}>
                      Takk nei
                    </button>}
                    <button onClick={()=>!sent&&express(j.id)} disabled={sent||!!busy}
                      style={{...btnBase,background:sent?`${C.accent}20`:`linear-gradient(135deg,${C.green},#059669)`,border:`1px solid ${sent?C.accent:C.green}`,color:sent?C.pop:"#fff",padding:"8px 14px",fontSize:12,opacity:busy===j.id?0.5:1}}>
                      {busy===j.id?"…":sent?"Interesse sendt ✓":"Jeg er interessert"}
                    </button>
                  </div>
                }
              </div>
            </JobCard>
          );
        })}
      </>}

      {tab==="interest"&&<>
        <Sec>Interesse sendt — venter på svar</Sec>
        {myInt.length===0&&<Empty text="Ingen jobber du har meldt interesse på"/>}
        {myInt.map(j=><JobCard key={j.id} job={j} isDJ><Bdg col={C.gold}>Venter ⏳</Bdg></JobCard>)}
      </>}

      {tab==="booked"&&<>
        <Sec>Mine bookinger</Sec>
        {myBooks.length===0&&<Empty text="Ingen bookinger ennå"/>}
        {myBooks.map(j=>{
          const isPast=j.date<today();
          return(
            <JobCard key={j.id} job={j} isDJ>
              <ChatPanel messages={j.messages||[]} onSend={t=>sendMsg(j.id,t)}/>
              {!j.cancelRequest&&!isPast&&<button onClick={()=>setCancelModal(j.id)} style={{...btnBase,background:`${C.red}20`,border:`1px solid ${C.red}44`,color:C.red,padding:"6px 10px",fontSize:11,marginTop:6}}>⚠️ Be om å avlyse / bytte vakt</button>}
              {j.cancelRequest&&<div style={{marginTop:6,fontSize:11,color:j.cancelRequest.rejected?C.red:C.gold}}>
                {j.cancelRequest.rejected?"Avlysningsforespørsel avslått av utested.":"⏳ Avlysningsforespørsel sendt – venter på svar."}
              </div>}
              {isPast&&!j.ratings?.djGiven&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
                <Lbl>Gi {j.venueName} en rating</Lbl>
                <RatingPicker onRate={val=>rateVenue(j.id,val)}/>
              </div>}
              {j.ratings?.djGiven&&<div style={{marginTop:4,fontSize:12,color:C.gold}}>Din rating av stedet: {stars(j.ratings.djGiven)}</div>}
            </JobCard>
          );
        })}
        {myBooks.length>0&&<Card style={{background:`${C.accent}10`,border:`1px solid ${C.accent}44`}}>
          <div style={{color:C.muted,fontSize:11,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Din hyre å fakturere XIID AS</div>
          <div style={{fontSize:26,fontWeight:800,color:C.pop}}>{fmtNOK(totFee)}</div>
          <div style={{color:C.dim,fontSize:11,marginTop:3}}>Send faktura til XIID AS — ikke til utestedet direkte</div>
        </Card>}
      </>}

      {tab==="profil"&&<>
        <Sec>Innstillinger</Sec>
        <ManualButton role="dj"/>
        <NotifPrefs user={user} onSave={onUpdateUser}/>
        <Card>
          <div style={{textAlign:"center",marginBottom:16}}>
            <Img src={user.avatar} name={user.name} size={88} style={{border:`3px solid ${C.accent}`,display:"block",margin:"0 auto 10px"}}/>
            <label style={{...btnBase,border:`1px solid ${C.accent}`,color:C.pop,background:"transparent",padding:"6px 12px",cursor:"pointer",fontSize:11,display:"inline-block"}}>
              {uploading?"Laster opp…":"📷 Last opp bilde"}
              <input type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
            </label>
          </div>
          <div style={{fontWeight:700,marginBottom:1}}>{user.name}</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:14}}>{user.email}</div>
          <LF lbl="Telefon" defaultValue={phone} onChange={v=>setPhone(v)}/>
          <LF lbl="Instagram (uten @)" defaultValue={insta} ph="ditt_brukernavn" onChange={v=>setInsta(v)}/>
          {insta&&<div style={{marginBottom:12}}><a href={`https://instagram.com/${insta}`} target="_blank" rel="noopener noreferrer" style={{color:C.pink,fontSize:13,textDecoration:"none"}}>📸 instagram.com/{insta}</a></div>}
          <Lbl>Sjangrene jeg spiller ({genres.length} valgt)</Lbl>
          <div style={{border:`1px solid ${C.border}`,borderRadius:8,padding:8,maxHeight:200,overflowY:"auto",background:C.surface,marginBottom:12}}>
            {GENRES.map(g=><span key={g} style={chip(genres.includes(g))} onClick={()=>tg(g)}>{g}</span>)}
          </div>
          <Lbl>Områder jeg opererer i ({areas.length} valgt)</Lbl>
          <div style={{border:`1px solid ${C.border}`,borderRadius:8,padding:8,background:C.surface,marginBottom:12}}>
            {AREAS.map(a=>{const on=areas.includes(a);return<span key={a} style={chip(on)} onClick={()=>setAreas(p=>on?p.filter(x=>x!==a):[...p,a])}>{a}</span>;})}
          </div>
          <LF lbl="Bio" multiline defaultValue={bio} onChange={v=>setBio(v)}/>
          {saveOk&&<div style={{color:C.green,fontSize:12,marginBottom:8}}>{saveOk}</div>}
          <Btn onClick={saveProfile}>Lagre profil</Btn>
        </Card>
        <NotifPrefs user={user} onSave={onUpdateUser}/>
        <ChangePassword user={user} onSave={onUpdateUser}/>
      </>}
    </Page>
  );
}

function CancelModal({jobId,onSubmit,onClose}) {
  const [reason,setReason]=useState("");
  return(
    <Modal title="Be om avlysning / vaktytte" onClose={onClose}>
      <p style={{color:C.muted,fontSize:13,lineHeight:1.6,marginTop:0}}>Utestedet vil motta din forespørsel og avgjør om plassen frigjøres. Fyll inn årsak:</p>
      <Lbl>Årsak *</Lbl>
      <textarea style={{...is,height:80,resize:"vertical",marginBottom:12}} placeholder="Sykdom, familiær årsak, dobbelbooking…" value={reason} onChange={e=>setReason(e.target.value)}/>
      <Row>
        <Btn red onClick={()=>{if(!reason.trim())return;onSubmit(jobId,reason.trim());}}>Send forespørsel</Btn>
        <Btn outline onClick={onClose}>Avbryt</Btn>
      </Row>
    </Modal>
  );
}

function RatingPicker({onRate}) {
  const [hov,setHov]=useState(0);
  const [sel,setSel]=useState(0);
  return(
    <div style={{display:"flex",gap:4,marginBottom:8}}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} onMouseEnter={()=>setHov(n)} onMouseLeave={()=>setHov(0)}
          onClick={()=>{setSel(n);onRate(n);}}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:n<=(hov||sel)?C.gold:C.dim,padding:"0 2px"}}>★</button>
      ))}
    </div>
  );
}

/* ─── SHARED CALENDAR ────────────────────────────────────────────────────── */
const MO=["Januar","Februar","Mars","April","Mai","Juni","Juli","August","September","Oktober","November","Desember"];
const WD=["Man","Tir","Ons","Tor","Fre","Lør","Søn"];

function CalGrid({jobs,showExport}) {
  const now=new Date();
  const[cal,setCal]=useState({y:now.getFullYear(),m:now.getMonth()});
  const[sel,setSel]=useState(null);
  const{y,m}=cal;
  const fw=(new Date(y,m,1).getDay()+6)%7;
  const days=new Date(y,m+1,0).getDate();
  const td=now.toISOString().slice(0,10);
  const ds=d=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const bd={};(jobs||[]).forEach(j=>{(bd[j.date]||(bd[j.date]=[])).push(j);});
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <Btn outline onClick={()=>setCal(p=>p.m===0?{y:p.y-1,m:11}:{...p,m:p.m-1})}>←</Btn>
        <div style={{fontWeight:700,fontSize:14}}>{MO[m]} {y}</div>
        <Btn outline onClick={()=>setCal(p=>p.m===11?{y:p.y+1,m:0}:{...p,m:p.m+1})}>→</Btn>
      </div>
      {showExport&&<div style={{display:"flex",gap:8,marginBottom:12}}>
        <button onClick={()=>downloadICS(generateICS(jobs||[]))} style={{...btnBase,background:`${C.accent}20`,border:`1px solid ${C.accent}`,color:C.pop,padding:"6px 12px",fontSize:11,flex:1}}>
          📅 Eksporter til iCal / Apple Kalender
        </button>
        <button onClick={()=>exportToCSV(jobs||[])} style={{...btnBase,background:`${C.green}20`,border:`1px solid ${C.green}`,color:C.green,padding:"6px 12px",fontSize:11,flex:1}}>
          📊 Eksporter til Excel (.csv)
        </button>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
        {WD.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:C.dim,fontWeight:600,padding:"3px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:12}}>
        {Array(fw).fill(null).map((_,i)=><div key={"e"+i}/>)}
        {Array(days).fill(null).map((_,i)=>{
          const d=i+1,s=ds(d),dj=bd[s]||[];
          const isT=s===td,isS=sel===s;
          return(
            <div key={d} onClick={()=>setSel(isS?null:s)}
              style={{minHeight:44,background:isS?`${C.accent}44`:dj.length?`${C.accent}11`:C.card,border:`1px solid ${isS?C.accent:isT?C.pop:C.border}`,borderRadius:7,padding:"4px 5px",cursor:dj.length?"pointer":"default"}}>
              <div style={{fontSize:11,fontWeight:isT?700:400,color:isT?C.pop:C.txt,marginBottom:2}}>{d}</div>
              <div style={{display:"flex",gap:2}}>
                {dj.some(j=>j.status==="booked")&&<div style={{width:6,height:6,borderRadius:3,background:C.green}}/>}
                {dj.some(j=>j.status==="open")&&<div style={{width:6,height:6,borderRadius:3,background:C.gold}}/>}
              </div>
              {dj[0]&&<div style={{fontSize:9,color:C.muted,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{dj[0].bookedDjName||dj[0].venueName}</div>}
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:12,fontSize:11,color:C.muted}}>
        <span><span style={{display:"inline-block",width:7,height:7,borderRadius:4,background:C.green,marginRight:3}}/>Booket</span>
        <span><span style={{display:"inline-block",width:7,height:7,borderRadius:4,background:C.gold,marginRight:3}}/>Ledig</span>
      </div>
      {sel&&bd[sel]&&<div style={{marginTop:4}}><div style={{fontWeight:700,marginBottom:8,color:C.pop,fontSize:12}}>{fmtDate(sel)}</div>{bd[sel].map(j=><JobCard key={j.id} job={j}/>)}</div>}
    </div>
  );
}

/* ─── SHARED JOB CARD ────────────────────────────────────────────────────── */
function JobCard({job,isDJ,children}) {
  const isB=job.status==="booked";
  const fee=isDJ?(job.djFee||0):(job.totalFee||0);
  return(
    <Card style={{borderLeft:`3px solid ${isB?C.green:C.gold}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Img src={job.venueLogo} name={job.venueName} size={34} style={{borderRadius:8,border:`1px solid ${C.border}`,flexShrink:0}}/>
          <div>
            <div style={{fontWeight:700}}>{job.venueName}</div>
            <div style={{color:C.muted,fontSize:11}}>📍 {job.city} · {fmtDate(job.date)} · {job.startTime}–{job.endTime}</div>
            <MapsLinks address={job.venueAddress} city={job.city} sm/>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          <Bdg col={isB?C.green:C.gold} sm>{isB?"Booket":"Ledig"}</Bdg>
          {job.projectNum&&<code style={{fontSize:9,color:C.dim,background:C.surface,borderRadius:4,padding:"1px 5px"}}>{job.projectNum}</code>}
        </div>
      </div>
      {job.targetMode==="favorites"&&<div style={{fontSize:10,color:C.pink,marginBottom:5}}>❤️ Kun til favoritter</div>}
      <div style={{marginBottom:7}}>{(job.genres||[]).map(g=><span key={g} style={chip(true)}>{g}</span>)}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:8,marginBottom:children?8:0}}>
        <div>
          <div style={{fontWeight:800,fontSize:14,color:C.pop}}>{fmtNOK(fee)}</div>
          <div style={{fontSize:10,color:C.dim}}>{isDJ?"Din hyre":"Total inkl. påslag"} · {job.hours}t × 1000 kr</div>
        </div>
        {isB&&job.bookedDjName&&!isDJ&&<div style={{fontSize:12,color:C.muted}}>🎧 {job.bookedDjName}</div>}
      </div>
      {job.description&&<div style={{paddingTop:7,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.muted,marginBottom:children?8:0}}>{job.description}</div>}
      {children}
    </Card>
  );
}

/* ─── CONTRACT MODAL ─────────────────────────────────────────────────────── */
function ContractModal({job,djName,venueName,onAccept,onClose}) {
  const[ok,setOk]=useState(false);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...cs,maxWidth:520,width:"100%",maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden",border:`1px solid ${C.hi}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h2 style={{margin:0,fontSize:15}}>📄 Bookingkontrakt — {APP.name}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1,paddingRight:4,marginBottom:12}}>
          <div style={{background:C.surface,border:`1px solid ${C.accent}44`,borderRadius:9,padding:12,marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:12,color:C.pop,marginBottom:10}}>Avtaledetaljer</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:12}}>
              {[["Oppdragsgiver",venueName],["Artist",djName],["Dato",fmtDate(job.date)],["Tid",`${job.startTime}–${job.endTime}`],["Varighet",`${job.hours} timer`],["Artisthonorar",fmtNOK(job.djFee||0)],["Påslag XIID",fmtNOK(1000)],["Total",fmtNOK(job.totalFee||0)]].map(([l,v])=>(
                <div key={l}><div style={{color:C.muted,fontSize:10,marginBottom:1}}>{l}</div><div style={{fontWeight:600,color:l==="Total"?C.pop:C.txt}}>{v}</div></div>
              ))}
            </div>
            <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
              <div style={{color:C.muted,fontSize:10,marginBottom:5}}>SJANGER</div>
              {(job.genres||[]).map(g=><span key={g} style={chip(true)}>{g}</span>)}
            </div>
          </div>
          {T_CONTRACT.map(s=>(
            <div key={s.t} style={{marginBottom:11,paddingBottom:11,borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontWeight:700,fontSize:12,color:C.pop,marginBottom:3}}>{s.t}</div>
              <div style={{color:C.muted,fontSize:12,lineHeight:1.65}}>{s.b}</div>
            </div>
          ))}
        </div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,flexShrink:0}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:10,fontSize:12,userSelect:"none",fontFamily:FF}}>
            <input type="checkbox" checked={ok} onChange={e=>setOk(e.target.checked)} style={{accentColor:C.accent,width:14,height:14}}/>
            Jeg bekrefter bookingen og godtar kontraktsvilkårene på vegne av {venueName}
          </label>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{if(ok)onAccept();}} disabled={!ok}
              style={{fontFamily:FF,fontWeight:700,fontSize:13,borderRadius:8,padding:"10px 18px",cursor:ok?"pointer":"not-allowed",border:"none",
                background:ok?`linear-gradient(135deg,${C.green},#059669)`:`${C.green}55`,
                color:"#fff",opacity:ok?1:0.4}}>
              ✓ Bekreft booking
            </button>
            <button onClick={onClose}
              style={{fontFamily:FF,fontWeight:600,fontSize:13,borderRadius:8,padding:"10px 14px",cursor:"pointer",
                background:"transparent",color:C.pop,border:`1px solid ${C.accent}`}}>
              Avbryt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── BRUKERMANUAL ───────────────────────────────────────────────────────── */
const MANUAL = {
  venue: {
    title:"📖 Manual for utesteder",
    sections:[
      { icon:"🔐", h:"Registrering og innlogging",
        body:`1. Trykk «Jeg er et utested» på forsiden.\n2. Fyll ut kontaktperson, e-post, passord (gjenta), stedsnavn og adresse.\n3. Godta oppdragsgivervilkårene og send søknad til XIID.\n4. XIID godkjenner kontoen — logg inn med e-posten din.\n\n💡 Stedet finnes allerede? Bruk Utested-ID fra en kollega under Innstillinger → «Koble til eksisterende utested».`},
      { icon:"📋", h:"Legg ut en jobb",
        body:`Gå til «+ Ny jobb».\n\n• Enkeltdato — én kveld\n• Flere datoer — legg til valgfrie datoer\n• Gjentakende — velg ukedag + periode (f.eks. hver fredag hele våren)\n\nVelg sjanger og hvem som skal se jobben:\n• Alle passende DJer — alle godkjente artister med riktig sjanger\n• Kun favoritter ❤️ — kun dine favorittartister på dette stedet\n\n💡 Lag en mal! Sett opp en jobb og trykk «Lagre som mal» — neste gang er det ett klikk.`},
      { icon:"✅", h:"Velg og book artist",
        body:`Gå til «Mine jobber». Jobber med svar vises med gult antall.\n\n1. Se hvem som er interessert — profilbilde, sjangre og rating.\n2. Rød bakgrunn = artisten er opptatt et annet sted samme tid → velg en annen.\n3. Trykk «Se profil» for full profil, Instagram og bio.\n4. Trykk «Velg ✓» → les og signer digital bookingkontrakt.`},
      { icon:"❤️", h:"Favoritter og browse",
        body:`Under «Finn Artist» blar du gjennom alle godkjente artister.\n\n• Søk på navn øverst\n• Filtrer på type (DJ / Instrumentalist) og sjanger\n• Trykk ❤️ for å legge til som favoritt\n\n⚠️ Favoritter er knyttet til utestedet, ikke til deg som bruker. Gamla og Lawo har separate favorittlister.`},
      { icon:"⚠️", h:"Avlysningsforespørsler",
        body:`Hvis en booket artist vil trekke seg sender de en forespørsel.\n\n🤒 Sykdom eller 🔄 Bytte vakt — med årsak\n\nDu ser det som varsling øverst i «Mine jobber»:\n• «✓ Godkjenn»: Bookingen åpnes igjen, ny artist kan søke.\n• «✕ Avslå»: Artisten er fortsatt booket og plikter å møte.`},
      { icon:"🧾", h:"Prosjektnummer og faktura",
        body:`Alle bookinger får et unikt prosjektnummer, f.eks. XIID-2026-1042.\n\n• XIID fakturerer dere totalbeløp med dette nummeret som referanse\n• Artisten fakturerer XIID med samme nummer\n• Oppgi alltid prosjektnummeret ved spørsmål til XIID`},
    ]
  },
  dj: {
    title:"📖 Manual for artister",
    sections:[
      { icon:"👤", h:"Registrering og profil",
        body:`1. Trykk «Jeg er DJ / Artist» på forsiden.\n2. Last opp profilbilde — det er det første utesteder ser!\n3. Velg type: 🎧 DJ eller 🎸 Instrumentalist.\n4. Fyll ut navn, e-post, passord (gjenta), telefon og Instagram.\n5. Velg sjangrene du spiller — du ser kun jobber som matcher disse.\n6. Velg områder du jobber i.\n7. Skriv en kort bio (2–3 setninger).\n8. Godta artistvilkårene og send søknad til XIID.\n\n💡 Bio-tips: «Tech House og Afro House — 8 år i bransjen, resident på Blå. Fredag- og lørdagskvelder.»`},
      { icon:"🔍", h:"Finn og søk på jobber",
        body:`Gå til «Ledige». Du ser jobber som matcher sjangrene dine.\n\n• Jobber du allerede er booket samme tid vises med ⛔ rød «Opptatt»-markering.\n• Favorittjobber ❤️ er fra utesteder som har deg som favorittartist — prioriter disse!\n\nTrykk «Jeg er interessert» — utestedet varsles og ser profilen din.\n\n⏱️ Svar raskt — utesteder velger gjerne den første artisten som passer.`},
      { icon:"📅", h:"Når du er booket",
        body:`Gå til «Bookinger» for å se bekreftede oppdrag.\n\n1. Sjekk prosjektnummeret (f.eks. XIID-2026-1042) — dette trengs på fakturaen.\n2. Bruk chat-funksjonen for praktisk info med utestedet.\n3. Møt presis og lever avtalt program.\n4. Gi utestedet en rating etter jobben.`},
      { icon:"🤒", h:"Be om avlysning",
        body:`Inne på en booket jobb finner du to knapper:\n\n🤒 Sykdom — du er syk og kan ikke stille\n🔄 Bytte vakt — du ønsker å bytte\n\nLegg til evt. forklaring og send forespørselen.\n\n⚠️ Utestedet avgjør — godkjenner de, åpnes jobben for ny søk. Avslår de, må du stille.\n\n⚠️ Gjentatte avlysninger kan føre til suspensjon fra plattformen.`},
      { icon:"🧾", h:"Fakturering",
        body:`Du fakturerer alltid XIID AS — aldri utestedet direkte.\n\nHusk alltid prosjektnummeret som referanse på fakturaen:\n«XIID-2026-1042 — DJ-oppdrag Gamla 12.06.2026»\n\nXIID legger til påslag og fakturerer utestedet.`},
    ]
  }
};

function ManualButton({role}) {
  const [open,setOpen]=useState(false);
  if(!MANUAL[role])return null;
  return(
    <>
      {open&&<ManualModal role={role} onClose={()=>setOpen(false)}/>}
      <button onClick={()=>setOpen(true)}
        style={{...btnBase,width:"100%",background:`${C.accent}12`,border:`1px solid ${C.accent}33`,color:C.pop,fontSize:13,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        📖 Brukermanual — {role==="venue"?"Utesteder":"Artister"}
      </button>
    </>
  );
}

function ManualModal({role,onClose}) {
  const [chapIdx,setChapIdx]=useState(0);
  const m=MANUAL[role];
  const chap=m.sections[chapIdx];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:600,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{fontWeight:800,fontSize:15,fontFamily:'"Space Grotesk",sans-serif'}}>{m.title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22,lineHeight:1}}>✕</button>
        </div>
        <div style={{display:"flex",gap:4,padding:"10px 14px",overflowX:"auto",flexShrink:0,borderBottom:`1px solid ${C.border}`}}>
          {m.sections.map((sec,i)=>(
            <button key={i} onClick={()=>setChapIdx(i)}
              style={{...btnBase,padding:"6px 14px",fontSize:12,background:chapIdx===i?`linear-gradient(135deg,${C.accent},${C.hi})`:"transparent",border:`1px solid ${chapIdx===i?C.accent:C.border}`,color:chapIdx===i?"#fff":C.muted,whiteSpace:"nowrap"}}>
              {sec.icon} {i+1}
            </button>
          ))}
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"20px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <span style={{fontSize:28}}>{chap.icon}</span>
            <h2 style={{fontSize:17,fontWeight:800,fontFamily:'"Space Grotesk",sans-serif',color:C.txt}}>{chap.h}</h2>
          </div>
          <div style={{color:C.muted,fontSize:13,lineHeight:1.75,whiteSpace:"pre-line"}}>{chap.body}</div>
        </div>
        <div style={{display:"flex",gap:8,padding:"12px 18px 18px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
          <button onClick={()=>setChapIdx(i=>Math.max(0,i-1))} disabled={chapIdx===0}
            style={{...btnBase,flex:1,background:"transparent",border:`1px solid ${C.border}`,color:chapIdx===0?C.dim:C.muted,fontSize:13,opacity:chapIdx===0?0.35:1}}>← Forrige</button>
          <button onClick={()=>setChapIdx(i=>Math.min(m.sections.length-1,i+1))} disabled={chapIdx===m.sections.length-1}
            style={{...btnBase,flex:1,background:chapIdx===m.sections.length-1?"transparent":`linear-gradient(135deg,${C.accent},${C.hi})`,border:`1px solid ${C.accent}`,color:"#fff",fontSize:13,opacity:chapIdx===m.sections.length-1?0.35:1}}>Neste →</button>
        </div>
      </div>
    </div>
  );
}

function TermsBox({title,terms,onAccept,onBack,acceptLabel}) {
  const [ok, setOk] = useState(false);
  const accepted = acceptLabel || "Godta";
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
      {title && <h2 style={{margin:"0 0 14px",fontSize:15,color:C.txt,fontWeight:700}}>{title}</h2>}
      <div style={{maxHeight:"52vh",overflowY:"auto",marginBottom:14,paddingRight:4}}>
        {(terms||[]).map(s=>(
          <div key={s.t} style={{marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontWeight:700,fontSize:12,color:C.pop,marginBottom:4}}>{s.t}</div>
            <div style={{color:C.muted,fontSize:12,lineHeight:1.65,whiteSpace:"pre-line"}}>{s.b}</div>
          </div>
        ))}
        <div style={{color:C.dim,fontSize:11,textAlign:"center",paddingTop:6}}>— Slutt —</div>
      </div>
      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:12,fontSize:13,userSelect:"none",fontFamily:FF}}>
          <input type="checkbox" checked={ok} onChange={e=>setOk(e.target.checked)}
            style={{accentColor:C.accent,width:15,height:15,cursor:"pointer"}}/>
          <span style={{color:C.muted}}>Jeg har lest og godtar vilkårene til KLUBB DJs by XIID AS</span>
        </label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>{if(ok)onAccept();}} disabled={!ok}
            style={{fontFamily:FF,fontWeight:700,fontSize:13,borderRadius:8,padding:"9px 16px",cursor:ok?"pointer":"not-allowed",border:"none",
              background:ok?`linear-gradient(135deg,${C.accent},${C.hi})`:`${C.accent}55`,
              color:"#fff",opacity:ok?1:0.45}}>
            {accepted}
          </button>
          {onBack && (
            <button onClick={onBack}
              style={{fontFamily:FF,fontWeight:600,fontSize:13,borderRadius:8,padding:"9px 16px",cursor:"pointer",
                background:"transparent",color:C.pop,border:`1px solid ${C.accent}`}}>
              Tilbake
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatPanel({messages,onSend}) {
  const[text,setText]=useState("");
  const endRef=useRef(null);
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[messages]);
  const send=()=>{if(!text.trim())return;onSend(text);setText("");};
  return(
    <div style={{marginTop:8,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
      <div style={{background:C.surface,padding:"4px 10px",borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontWeight:600}}>💬 Meldinger</div>
      <div style={{maxHeight:150,overflowY:"auto",padding:"8px 10px",background:C.bg}}>
        {messages.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"10px 0"}}>Ingen meldinger ennå</div>}
        {messages.map(msg=>(<div key={msg.id} style={{marginBottom:7}}><span style={{fontWeight:600,fontSize:11,color:msg.fromRole==="dj"?C.pop:C.gold}}>{msg.fromName}</span><span style={{color:C.dim,fontSize:10,marginLeft:6}}>{msg.ts}</span><div style={{fontSize:12,color:C.txt,lineHeight:1.5}}>{msg.text}</div></div>))}
        <div ref={endRef}/>
      </div>
      <div style={{display:"flex",borderTop:`1px solid ${C.border}`}}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Skriv… (Enter = send)" style={{...is,borderRadius:0,border:"none",flex:1,fontSize:12}}/>
        <button onClick={send} style={{...btnBase,background:`linear-gradient(135deg,${C.accent},${C.hi})`,color:"#fff",border:"none",borderRadius:0,padding:"8px 14px",fontSize:12}}>Send</button>
      </div>
    </div>
  );
}

/* ─── UI PRIMITIVES ──────────────────────────────────────────────────────── */
const cs      = { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:14, marginBottom:10 };
const is      = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 11px", color:C.txt, fontSize:13, width:"100%", boxSizing:"border-box", outline:"none", fontFamily:FF, display:"block", marginBottom:10 };
const btnBase = { borderRadius:8, padding:"9px 14px", cursor:"pointer", fontWeight:600, fontSize:13, fontFamily:FF, border:"none" };
const chip    = on => ({ display:"inline-block", padding:"3px 9px", margin:"2px", borderRadius:20, fontSize:11, cursor:"pointer", fontWeight:500, border:`1px solid ${on?C.hi:C.border}`, background:on?`${C.accent}30`:"transparent", color:on?C.pop:C.muted });

function AppLogo({big}) {
  return(
    <div style={{textAlign:big?"center":undefined}}>
      <div style={{fontFamily:'"Space Grotesk",sans-serif',fontWeight:800,fontSize:big?32:18,letterSpacing:2,background:`linear-gradient(135deg,${C.pop},${C.gold})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>KLUBB DJs</div>
      <div style={{fontSize:big?13:9,color:C.pop,letterSpacing:2}}>by XIID</div>
    </div>
  );
}
function Card({style,children})  { return <div style={{...cs,...style}}>{children}</div>; }
function Page({children})        { return <div style={{maxWidth:760,margin:"0 auto",padding:"16px 12px 60px"}}>{children}</div>; }
function Center({children})      { return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:FF}}><div style={{maxWidth:500,width:"100%"}}>{children}</div></div>; }
function Modal({title,onClose,children}) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{...cs,maxWidth:500,width:"100%",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h2 style={{margin:0,fontSize:15}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Bdg({col,sm,style,children}) { return <span style={{background:col||C.accent,color:"#fff",borderRadius:30,padding:sm?"2px 7px":"3px 9px",fontSize:sm?10:11,fontWeight:700,display:"inline-block",...style}}>{children}</span>; }
function Btn({children,onClick,outline,green,red,full,disabled,style}) {
  const bg=green?`linear-gradient(135deg,${C.green},#059669)`:red?`linear-gradient(135deg,${C.red},#be123c)`:outline?"transparent":`linear-gradient(135deg,${C.accent},${C.hi})`;
  return <button onClick={onClick} disabled={disabled} style={{...btnBase,background:bg,border:outline?`1px solid ${C.accent}`:"none",color:outline?C.pop:"#fff",width:full?"100%":undefined,opacity:disabled?0.3:1,...style}}>{children}</button>;
}
function SC({label,value,color,sm}) {
  return(<div style={{...cs,padding:"10px 11px",marginBottom:0}}><div style={{color:C.muted,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:.6,marginBottom:2}}>{label}</div><div style={{fontSize:sm?12:22,fontWeight:800,color}}>{value}</div></div>);
}
function Tabs({tabs,active,onChange,badge={}}) {
  return(
    <div style={{display:"flex",gap:2,marginBottom:16,background:C.surface,padding:3,borderRadius:10,border:`1px solid ${C.border}`,flexWrap:"wrap"}}>
      {tabs.map(([k,lbl])=>(
        <button key={k} onClick={()=>onChange(k)} style={{flex:"1 1 auto",padding:"7px 5px",border:"none",borderRadius:7,cursor:"pointer",fontWeight:600,fontSize:11,background:active===k?`linear-gradient(135deg,${C.accent},${C.hi})`:"transparent",color:active===k?"#fff":C.muted,whiteSpace:"nowrap",fontFamily:FF}}>
          {lbl}{badge[k]>0?<span style={{background:C.gold,color:"#000",borderRadius:10,padding:"1px 6px",fontSize:9,marginLeft:3,fontWeight:800}}>{badge[k]}</span>:null}
        </button>
      ))}
    </div>
  );
}
function Lbl({children})   { return <div style={{color:C.muted,fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>{children}</div>; }
function Sec({children})   { return <h2 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:C.txt}}>{children}</h2>; }
function Empty({text})     { return <div style={{textAlign:"center",padding:"32px 20px",color:C.muted,fontSize:13}}>{text}</div>; }
function Row({children})   { return <div style={{display:"flex",gap:8}}>{children}</div>; }
function Em({msg})         { return <div style={{color:C.red,fontSize:12,marginBottom:8,padding:"6px 10px",background:`${C.red}15`,borderRadius:7}}>{msg}</div>; }
function PassField({lbl, value, onChange, placeholder}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{marginBottom:10}}>
      {lbl&&<Lbl>{lbl}</Lbl>}
      <div style={{position:"relative"}}>
        <input
          type={show?"text":"password"}
          value={value||""}
          placeholder={placeholder||""}
          onChange={e=>onChange(e.target.value)}
          style={{...is, marginBottom:0, paddingRight:44}}
        />
        <button onClick={()=>setShow(p=>!p)} type="button"
          style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:15,padding:"0 2px",fontFamily:FF}}>
          {show?"🙈":"👁"}
        </button>
      </div>
    </div>
  );
}
function LF({lbl,type="text",onChange,ph="",multiline,defaultValue,min}) {
  return(<div style={{marginBottom:10}}>{lbl&&<Lbl>{lbl}</Lbl>}{multiline?<textarea defaultValue={defaultValue} style={{...is,height:56,resize:"vertical",marginBottom:0}} placeholder={ph} onChange={e=>onChange(e.target.value)}/>:<input style={{...is,marginBottom:0}} type={type} placeholder={ph} defaultValue={defaultValue} min={min} onChange={e=>onChange(e.target.value)}/>}</div>);
}
function Img({src,name,size,style}) {
  const[err,setErr]=useState(false);
  useEffect(()=>setErr(false),[src]);
  return <img src={(!src||err)?mkAvatar(name,size):src} alt={name||""} onError={()=>setErr(true)} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,...style}}/>;
}
