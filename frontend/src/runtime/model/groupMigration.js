// Pure conversion: root ids/frames/actions/overrides survive; child coordinates use the legacy CSS metrics.
const fr = (x,y,w,h) => ({ anchor:"top-left", x,y,w,h });
const textH = (text,w,size,line=1.5) => Math.max(1,String(text ?? "").split("\n").reduce((n,lineText)=>n+Math.max(1,Math.ceil(lineText.length * size * .51 / Math.max(1,w))),0))*size*line;
const row = (id,template,props,x,y,w,h,z=0) => ({id,template,props,frame:fr(x,y,w,h),mobile:{mode:"auto"},hidden:false,locked:false,z});
export const LEGACY_COMPOSITES = ["glass-card","feature-list","stats-row","stats-counter","button"];
export function convertLegacyElement(element) {
  if (!element || typeof element !== "object") return element;
  if (element.props?.compositeLeaf) return element;
  if (!LEGACY_COMPOSITES.includes(element.template)) {
    if (!element.children?.length) return element;
    const children=element.children.map(convertLegacyElement);
    return children.some((c,i)=>c!==element.children[i]) ? {...element,children} : element;
  }
  const p=element.props ?? {}, id=element.id || "piece";
  let width=element.frame?.w || 360;
  const children=[]; let height=0, serial=0;
  const add=(template,props,x,y,w,h)=>children.push(row(`${id}--${++serial}`,template,props,x,y,w,h,serial));
  const text=(value,variant,x,y,w,size,color,extra={})=>{
    const h=textH(value,w,size,variant==="title" ? 1.2 : variant==="kicker" ? 1.4 : 1.5);
    add("text",{text:String(value ?? ""),variant,size,lineHeight:variant==="title"?1.2:variant==="kicker"?1.4:1.5,color:color ?? "",...extra},x,y,w,h);return h;
  };
  let finish={fill:"rgba(0,0,0,0)",glass:false,borderWidth:0,shadow:false,padding:0};
  if(element.template==="button") {
    const border = p.variant === "glass" || p.variant === "ghost" ? 1 : 0;
    width -= border * 2;
    const label = p.label ?? "Entrar al tour", icon = p.icon ?? "arrow-right";
    const size = p.size > 0 ? p.size : 13.5, padY = 14;
    const textWidth = Math.max(20,width - 18 - 16 - (icon ? 30 : 0));
    const h = textH(label,textWidth,size,1.2);
    finish={...p,label,icon,variant:p.variant || "primary",action:p.action ?? {type:"enter",target:null},fill:p.fill ?? "",color:p.color ?? "",padding:padY};
    height=element.frame?.h > 0 ? Math.max(1,element.frame.h-border*2) : Math.max(h,16)+padY*2;
    const y=(height-h)/2;
    add("text",{text:String(label),variant:"paragraph",size,color:p.color || "inherit",font:p.font || "body",weight:p.weight || 600,lineHeight:1.2},18,y,textWidth,0);
    children[0].role="button-label";
    if(icon) { add("icon",{icon,size:16,color:"inherit"},width-32,(height-16)/2,16,16);children.at(-1).role="button-icon"; }
  } else if(element.template==="glass-card") {
    const pad=p.padding ?? 22, gap=p.gap ?? 18, inner=width-pad*2;
    finish={...p,padding:pad}; delete finish.children; delete finish.kicker;delete finish.title;delete finish.body;
    let y=pad;
    for(const [key,variant,size] of [["kicker","kicker",10.5],["title","title",20],["body","paragraph",14]]) {
      const value=p[key] ?? (key==="title" ? "Título de la tarjeta" : "");
      if(value) { y+=text(value,variant,pad,y,inner,size,key==="body" ? p.secondaryColor : p.color)+10; }
    }
    y=Math.max(pad,y-10);
    const pieces=(p.children ?? []).filter((c)=>LEGACY_COMPOSITES.includes(c.template)||c.template);
    if(pieces.length && y>pad)y+=10;
    pieces.forEach((piece,i)=>{
      const child=convertLegacyElement(row(`${id}--piece-${i+1}`,piece.template,piece.props ?? {},pad,y,inner,0,i+1));
      const h=child.props?.contentHeight || child.frame.h || 40;
      children.push({...child,frame:fr(pad,y,inner,h)});y+=h+(i<pieces.length-1?gap:0);
    });
    height=y+pad;
  } else if(element.template==="feature-list") {
    let y=0;
    const heading=p.heading ?? "Lo que vas a ver";
    if(heading)y=text(heading,"kicker",0,y,width,10.5)+12;
    const items=p.items ?? [{icon:"layers",text:"Todos los pisos, uno por uno"},{icon:"map-pin",text:"Puntos de interés en cada sala"},{icon:"eye",text:"Vista de 360° con zoom"}];
    items.slice(0,10).forEach((item,i)=>{
      const h=textH(item.text,width-28,14,1.4);
      if(item.icon)add("icon",{icon:item.icon,size:16,color:p.iconColor ?? ""},0,y+(h-16)/2,16,16);
      text(item.text,"paragraph",28,y,width-28,14,p.color,{lineHeight:1.4});y+=h+(i<items.length-1?12:0);
    });height=y;
    finish={...finish,...Object.fromEntries(Object.entries(p).filter(([key])=>!['heading','items','color','iconColor'].includes(key)))};
  } else if(element.template==="stats-row") {
    const items=(p.items ?? [{value:"5",label:"Pisos"},{value:"12",label:"Salas"},{value:"2",label:"Idiomas"}]).slice(0,8);
    // Legacy flex cells keep intrinsic widths; only their parent may have an explicit width.
    const cells=items.map((item)=>Math.max(String(item.value??"").length*26*.62,String(item.label??"").length*10.5*(.6+.09)));
    const naturalWidth=cells.reduce((sum,w,i)=>sum+w+28+(i?29:0),0);
    if(!(element.frame?.w>0))width=naturalWidth;
    let cursor=0;
    items.forEach((item,i)=>{
      const x=cursor+(i?29:0), cell=cells[i];
      text(item.value,"title",x,0,cell,26,p.valueColor,{weight:600,lineHeight:1.1});
      text(item.label,"kicker",x,32.6,cell,10.5,p.labelColor,{font:"mono",letterSpacing:.945});
      if(i)add("shape",{fill:p.borderColor||"rgba(255,255,255,.15)",radius:0,glass:false,shadow:false,borderWidth:0},cursor,0,1,47.3);
      cursor+=cell+28+(i?29:0);
    });height=47.3;
  } else {
    const heading=p.heading ?? "En números";let y=0;
    if(heading)y=text(heading,"kicker",0,0,width,10.5)+10;
    // The counter remains a smart leaf, preserving its timers, suffixes and progress ticks.
    add("stats-counter",{...p,compositeLeaf:true,heading:"",fill:"rgba(0,0,0,0)",glass:false,shadow:false,borderWidth:0},0,y,width,82.4);height=y+82.4;
  }
  let mobile=element.mobile;
  if(element.template==="button" && mobile?.mode==="custom" && mobile.frame?.w>0) {
    const border=p.variant==="glass"||p.variant==="ghost"?1:0, mw=Math.max(1,mobile.frame.w-border*2), mh=mobile.frame.h>0?Math.max(1,mobile.frame.h-border*2):height;
    mobile={...mobile,contentWidth:mw,contentHeight:mh};
    children.forEach(child=>{const naturalHeight=child.frame.h || child.props.size*(child.props.lineHeight || 1.2);child.mobile={...child.mobile,groupFrame:{...child.frame,
      x:child.role==="button-icon"?mw-32:18,y:(mh-naturalHeight)/2,w:child.role==="button-label"?Math.max(20,mw-34-(children.some(row=>row.role==="button-icon")?30:0)):child.frame.w}};});
  }
  return {...element,template:"group",props:{...finish,autoFit:true,contentWidth:width,contentHeight:height,legacyTemplate:element.template},children,...(mobile?{mobile}:{})};
}
export function migrateDesignGroups(design) {
  if(!design || typeof design!=="object")return design;
  let changed=false;
  const convert=(element)=>{const next=convertLegacyElement(element);if(next!==element)changed=true;return next;};
  const screens=Object.fromEntries(Object.entries(design.screens ?? {}).map(([key,screen])=>[key,{...screen,elements:(screen.elements ?? []).map(convert)}]));
  const panels=design.panels?.map((panel)=>({...panel,elements:(panel.elements ?? []).map(convert)}));
  return changed?{...design,screens,...(panels?{panels}:{})}:design;
}

// La conversión sigue siendo pura. El editor puede aportar métricas del render
// anterior para conservar saltos de línea y fuentes sin aproximar su geometría.
export function applyGroupMeasurements(group, measurements, root = true) {
  const metric = measurements[group.id];
  return { ...group,
    ...(!root && metric?.frame ? { frame: { ...group.frame, ...metric.frame } } : {}),
    props: { ...group.props, ...metric?.props },
    ...(group.children ? { children: group.children.map(child => applyGroupMeasurements(child, measurements, false)) } : {}),
  };
}
