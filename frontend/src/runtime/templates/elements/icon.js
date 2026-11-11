import { h } from "../dom.js";
import { createIcon, ICON_NAMES } from "./icons.js";
import { animationDefault, animationSlot, applyStyle, px } from "./common.js";
import { resolveThemeProps } from "../../theme/index.js";
export const iconElement={
  id:"icon",kind:"element",name:"Icono",category:"Formas",mobile:"keep",interactive:false,
  defaults:{icon:"layers",size:24,color:"",stroke:1.9,animation:animationDefault},
  slots:[{key:"icon",type:"icon",label:"Icono",options:ICON_NAMES,toolbar:true},{key:"color",type:"color",label:"Color",toolbar:true},{key:"size",type:"range",label:"Tamaño",min:8,max:240,step:1,toolbar:true},{key:"stroke",type:"range",label:"Grosor del icono",min:.5,max:5,step:.1},animationSlot],
  render(props,ctx){const root=h("span",{className:"tour-rt-icon","data-slot":"icon"});iconElement.update(root,props,ctx);return root;},
  update(root,props,ctx){props=resolveThemeProps("icon",props,ctx?.doc?.design?.theme);const key=JSON.stringify([props.icon,props.size,props.stroke]);if(root.dataset.iconKey!==key){root.dataset.iconKey=key;root.replaceChildren(createIcon(props.icon,{size:Math.min(240,Math.max(8,Number(props.size)||24)),stroke:Number(props.stroke)||1.9}));}applyStyle(root,{color:props.color,width:px(props.size,24,8,240),height:px(props.size,24,8,240)});},
};
