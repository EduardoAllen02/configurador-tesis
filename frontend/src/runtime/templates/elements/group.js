import { visibleInScene } from "../../model/interfaceModel.js";
import { h } from "../dom.js";
import { mergeProps, numberOr } from "../../layout/util.js";
import { DEFAULT_THEME, resolveThemeProps } from "../../theme/index.js";
import { animationDefault, animationSlot, applyFinish, finishDefaults, finishSlots } from "./common.js";
import { groupChildFrame, groupDeviceProps } from "../../model/groupDevice.js";
import { buttonElement } from "./button.js";
const refsOf=new WeakMap();
const visible=(def,ctx)=>!def.hidden && !(ctx?.mobile && def.mobile?.mode === "hidden") && visibleInScene(def,ctx?.state?.sceneId);
export const resolveGroupProps = (saved, theme) => resolveThemeProps("group", saved, saved.themeOverride || theme || (saved.useSurfaceTheme ? DEFAULT_THEME : null));
export const groupElement={
  id:"group",kind:"element",name:"Grupo",category:"Tarjetas",mobile:"scale",interactive:false,fit:"content",
  defaults:{...finishDefaults,fill:"",color:"",secondaryColor:"",font:"",headingFont:"",padding:0,gap:18,autoFit:true,contentWidth:0,contentHeight:0,legacyTemplate:"",themeOverride:null,label:"",variant:"primary",icon:"",action:null,animation:animationDefault},
  slots:[{key:"fill",type:"color",label:"Fondo",toolbar:true},{key:"autoFit",type:"toggle",label:"Ajustar al contenido"},{key:"padding",type:"range",label:"Margen interior",min:0,max:100,step:1},...finishSlots,animationSlot],
  render(props,ctx){
    const inner=h("div",{className:"tour-rt-group-inner"});
    const root=props.legacyTemplate==="button" ? buttonElement.render(props,ctx) : h("div",{className:"tour-rt-group"});
    root.replaceChildren(inner);
    const refs={inner,items:[],signature:null,props,ctx,observer:null,disposed:false};refsOf.set(root,refs);
    if(typeof ResizeObserver==="function")refs.observer=new ResizeObserver(()=>{if(!refs.pending)refs.pending=requestAnimationFrame(()=>{refs.pending=null;groupElement.measure(root);});});
    groupElement.update(root,props,ctx);refs.observer?.observe(root);return root;
  },
  update(root,saved,ctx){
    const refs=refsOf.get(root);if(!refs)return;refs.ctx=ctx;
    const props=saved.legacyTemplate==="button" ? saved : resolveGroupProps(saved,ctx?.doc?.design?.theme);refs.props=props;
    if(props.legacyTemplate==="button") {
      const label=props.children?.find(child=>child.role==="button-label")?.props?.text ?? props.label;
      const replacement=buttonElement.update(root,{...props,label},ctx);
      if(replacement) { groupElement.dispose(root); return groupElement.render(props,ctx); }
      root.classList.add("tour-rt-group","tour-rt-btn-composite");
    } else applyFinish(root,props);
    const depth=ctx?.groupDepth ?? 0;
    const defs=(Array.isArray(props.children)?props.children:[]).filter((def)=>ctx?.getTemplate?.(def.template)&&!(def.template==="group"&&depth>=1));
    const signature=JSON.stringify(defs.map((def)=>[def.id,def.template,def.z]));
    if(signature!==refs.signature){
      refs.items.forEach((item)=>{refs.observer?.unobserve(item.content);item.template.dispose?.(item.content);});refs.items=[];refs.signature=signature;
      refs.inner.replaceChildren();
      [...defs].sort((a,b)=>(a.z??0)-(b.z??0)).forEach((def)=>{
        const template=ctx.getTemplate(def.template),wrapper=h("div",{className:"tour-rt-group-child"});
        const item={def,template,wrapper,content:null};refs.items.push(item);refs.inner.append(wrapper);
      });
    }
    const byId=new Map(defs.map((def)=>[def.id,def]));
    refs.items.forEach((item)=>{
      const def=byId.get(item.def.id);if(!def)return;item.def=def;
      const path=[ctx?.elementPath,def.id].filter(Boolean).join("/");
      const childCtx={...ctx,elementPath:path,groupDepth:depth+1, ...(props.themeOverride ? { doc: { ...ctx?.doc, design: { ...ctx?.doc?.design, theme: props.themeOverride } } } : {}) };
      const f=groupChildFrame(def,ctx?.mobile) ?? {};
      const p={...mergeProps(item.template,def.props),...(def.template==="group"?{children:def.children,width:f.w,height:f.h,...groupDeviceProps(def,ctx?.mobile)}: {})};
      item.wrapper.dataset.elId=def.id;item.wrapper.dataset.elPath=path;item.wrapper.dataset.parentId=ctx?.elementId || ctx?.elementPath?.split("/").at(-1) || "";item.wrapper.dataset.template=def.template;
      Object.assign(item.wrapper.style,{left:`${numberOr(f.x,0)}px`,top:`${numberOr(f.y,0)}px`,width:f.w>0?`${f.w}px`:"max-content",height:f.h>0?`${f.h}px`:"auto",zIndex:String(def.z??0),display:visible(def,ctx)?"":"none"});
      childCtx.elementId=def.id;
      if(!item.content){item.content=item.template.render(p,childCtx);item.wrapper.append(item.content);refs.observer?.observe(item.content);}
      else {const next=item.template.update(item.content,p,childCtx);if(next&&next!==item.content){refs.observer?.unobserve(item.content);item.content.replaceWith(next);item.content=next;refs.observer?.observe(next);}}
    });
    groupElement.measure(root);
  },
  measure(root){
    const refs=refsOf.get(root);if(!refs||refs.disposed)return;
    const p=refs.props,cw=Math.max(1,numberOr(p.contentWidth,0)||numberOr(p.width,360)||360);
    const available=(p.legacyTemplate==="button" ? root.clientWidth : 0) || root.parentElement?.clientWidth || numberOr(p.width,cw) || cw;
    const scale=available/cw;
    let height=p.detailAutoLayout?1:numberOr(p.contentHeight,0)||numberOr(p.height,0)||1;
    if(p.autoFit!==false){
      let bottom=0, flow=numberOr(p.padding,0,0,100);
      refs.items.forEach(({def,wrapper,content})=>{
        if(wrapper.style.display==="none")return;
        const f=groupChildFrame(def,refs.ctx?.mobile)??{}, natural=Math.max(content?.scrollHeight||0,content?.offsetHeight||0);
        const extent=Math.max(numberOr(f.h,0),natural);
        const y=p.detailAutoLayout?flow:numberOr(f.y,0);
        if(p.detailAutoLayout) { wrapper.style.top=`${y}px`; flow=y+extent+numberOr(p.detailGap,12); }
        bottom=Math.max(bottom,y+extent-numberOr(p.hotspotOriginY,0,-100000,100000));
      });
      height=Math.max(height,bottom+numberOr(p.padding,0,0,100));
    }
    refs.inner.style.width=`${Math.max(1,cw+numberOr(p.hotspotOriginX,0,-100000,100000))}px`;refs.inner.style.height=`${Math.max(1,height+numberOr(p.hotspotOriginY,0,-100000,100000))}px`;refs.inner.style.transform=`scale(${scale}) translate(${-numberOr(p.hotspotOriginX,0,-100000,100000)}px,${-numberOr(p.hotspotOriginY,0,-100000,100000)}px)`;root.dataset.groupScale=String(scale);root.dataset.contentWidth=String(cw);
    const border=(p.hotspotComposition || p.legacyTemplate==="button") && typeof getComputedStyle === "function" ? getComputedStyle(root) : null;
    const borderHeight=(parseFloat(border?.borderTopWidth)||0)+(parseFloat(border?.borderBottomWidth)||0);
    const target=p.autoFit===false && p.height>0?p.height:height*scale+borderHeight;
    const next=`${Math.round(target*100)/100}px`;if(root.style.height!==next)root.style.height=next;
  },
  dispose(root){const refs=refsOf.get(root);if(!refs)return;refs.disposed=true;refs.observer?.disconnect();if(refs.pending)cancelAnimationFrame(refs.pending);refs.items.forEach(({template,content})=>template.dispose?.(content));refsOf.delete(root);},
};
