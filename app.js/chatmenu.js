/* Chat header: the three-dot button (right side). It shows in chats with another person, exactly as before.
   In the verified Veltrix Support chat it shows ONLY for accounts with admin access (user app and admin page) and opens a small pop-up
   (same look as the disappearing-messages one) offering to switch to the admin dashboard / back to the user dashboard.
   It has no action yet - a new function will be attached here later: listen for the "vx-chat-menu" event
   (event.detail = { button, chat }) or set window.vxChatMenu.onClick = function(button, chat){...}.
   The chat screens call  window.vxChatMenu.onChat({...})  when a chat opens and  onChat(null)  when it closes. */
(function(){
"use strict";
const DOTS='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
const CLOCK='<svg class="vx-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 0a.5.5 0 0 0 0 1H7v1.07A7.001 7.001 0 0 0 8 16a7 7 0 0 0 5.29-11.584l.013-.012.354-.354.353.354a.5.5 0 1 0 .707-.707l-1.414-1.415a.5.5 0 1 0-.707.707l.354.354-.354.354-.012.012A6.97 6.97 0 0 0 9 2.071V1h.5a.5.5 0 0 0 0-1zm2 5.6V9a.5.5 0 0 1-.5.5H4.5a.5.5 0 0 1 0-1h3V5.6a.5.5 0 1 1 1 0"/></svg>';
let peer=null,pop=null,sw=null,sel=null,baseHidden=true;
const TRASH='<svg class="vx-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/></svg>';
const PEN='<svg class="vx-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="m13.498.795.149-.149a1.207 1.207 0 1 1 1.707 1.708l-.149.148a1.5 1.5 0 0 1-.059 2.059L4.854 14.854a.5.5 0 0 1-.233.131l-4 1a.5.5 0 0 1-.606-.606l1-4a.5.5 0 0 1 .131-.232l9.642-9.642a.5.5 0 0 0-.642.056L6.854 4.854a.5.5 0 1 1-.708-.708L9.44.854A1.5 1.5 0 0 1 11.5.796a1.5 1.5 0 0 1 1.998-.001"/></svg>';
const SWAP='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>';
/* true only for a signed-in account that has admin access */
function isAdminAccount(){try{const a=window.veltrixDB&&typeof window.veltrixDB.get==="function"?window.veltrixDB.get():null;return !!(a&&a.isAdmin)}catch(e){return false}}
function closePop(){if(pop){pop.remove();pop=null}const c=document.getElementById("vmChat");if(c)c.classList.remove("vxg-popopen")}
/* Verified Veltrix Support chat, admin accounts only: the pop-up offers to switch between the user dashboard and the admin dashboard */
function switchTarget(){
 const onAdminPage=document.documentElement.classList.contains("admin-page");
 return onAdminPage?{url:"index.html",title:"Switch to user dashboard",sub:"Back to the user app"}
  :{url:"admin.html",title:"Switch to admin dashboard",sub:"Open the admin section"}}
function openSwitchPop(btn){
 const chat=document.getElementById("vmChat");if(!chat||!sw)return;
 if(pop){closePop();return}
 pop=document.createElement("div");pop.className="vxg-pop vxg-switch";pop.setAttribute("role","menu");
 pop.innerHTML='<button type="button" class="vxg-item" role="menuitem">'+SWAP+'<span class="vxg-t">'+sw.title+'<small>'+sw.sub+'</small></span></button>';
 chat.appendChild(pop);
 const cr=chat.getBoundingClientRect(),br=btn.getBoundingClientRect();
 pop.style.top=(br.bottom-cr.top+6)+"px";pop.style.right=Math.max(8,cr.right-br.right)+"px";
 const url=sw.url;
 pop.firstChild.addEventListener("click",e=>{e.stopPropagation();closePop();try{location.href=url}catch(err){console.error(err)}})}
function openPop(btn){
 const chat=document.getElementById("vmChat"),d=window.vxDisappear;if(!chat||!d)return;
 if(pop){closePop();return}
 const on=!!d.get();
 pop=document.createElement("div");pop.className="vxg-pop";pop.setAttribute("role","menu");
 pop.innerHTML='<button type="button" class="vxg-item" role="menuitemcheckbox" aria-checked="'+on+'">'+CLOCK+'<span class="vxg-t">Disappearing messages<small>'+(on?"On \u00b7 24 hours":"Off")+'</small></span><i class="vxg-sw"></i></button>';
 chat.appendChild(pop);
 const cr=chat.getBoundingClientRect(),br=btn.getBoundingClientRect();
 pop.style.top=(br.bottom-cr.top+6)+"px";pop.style.right=Math.max(8,cr.right-br.right)+"px";
 const it=pop.firstChild;
 it.addEventListener("click",e=>{e.stopPropagation();const now=it.getAttribute("aria-checked")!=="true";it.setAttribute("aria-checked",String(now));it.querySelector("small").textContent=now?"On \u00b7 24 hours":"Off";
  try{d.set(now)}catch(err){console.error(err)}setTimeout(closePop,260)})}
/* Messages selected: the three dots float to draw attention and open the usual option(s) plus Delete message and (single editable text message) Edit message */
function refreshBtn(){const chat=document.getElementById("vmChat"),btn=chat&&$(".vxg-menubtn",chat);if(!btn)return;btn.hidden=sel?false:baseHidden;btn.classList.toggle("vxg-float",!!sel)}
function setSelection(s){const had=sel?sel.count:0;sel=s||null;if(!sel||sel.count!==had)closePop();refreshBtn()}
function openSelPop(btn){
 const chat=document.getElementById("vmChat");if(!chat||!sel)return;
 if(pop){closePop();return}
 const s=sel,d=window.vxDisappear;let h="";
 if(sw)h+='<button type="button" class="vxg-item" data-act="switch" role="menuitem">'+SWAP+'<span class="vxg-t">'+sw.title+'<small>'+sw.sub+'</small></span></button>';
 else if(peer&&(peer.real||peer.admin)&&d){const on=!!d.get();h+='<button type="button" class="vxg-item" data-act="disappear" role="menuitemcheckbox" aria-checked="'+on+'">'+CLOCK+'<span class="vxg-t">Disappearing messages<small>'+(on?"On \u00b7 24 hours":"Off")+'</small></span><i class="vxg-sw"></i></button>'}
 h+='<button type="button" class="vxg-item vxg-danger" data-act="delete" role="menuitem">'+TRASH+'<span class="vxg-t">Delete message</span></button>';
 if(s.edit)h+='<button type="button" class="vxg-item" data-act="edit" role="menuitem">'+PEN+'<span class="vxg-t">Edit message</span></button>';
 pop=document.createElement("div");pop.className="vxg-pop";pop.setAttribute("role","menu");pop.innerHTML=h;chat.appendChild(pop);chat.classList.add("vxg-popopen");
 const cr=chat.getBoundingClientRect(),br=btn.getBoundingClientRect();
 pop.style.top=(br.bottom-cr.top+6)+"px";pop.style.right=Math.max(8,cr.right-br.right)+"px";
 pop.addEventListener("click",e=>{const it=e.target.closest&&e.target.closest(".vxg-item");if(!it)return;e.stopPropagation();const a=it.dataset.act;
  try{
   if(a==="switch"){const url=sw.url;closePop();location.href=url}
   else if(a==="disappear"){const now=it.getAttribute("aria-checked")!=="true";it.setAttribute("aria-checked",String(now));it.querySelector("small").textContent=now?"On \u00b7 24 hours":"Off";d.set(now);setTimeout(closePop,260)}
   else if(a==="delete"){closePop();s.del()}
   else if(a==="edit"){closePop();s.edit.run()}
  }catch(err){console.error(err)}})}
document.addEventListener("click",e=>{if(pop&&!pop.contains(e.target)&&!(e.target.closest&&e.target.closest(".vxg-menubtn")))closePop()},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closePop()});
const $=(s,r)=>(r||document).querySelector(s);
function mountTab(){
 const chat=document.getElementById("vmChat"),head=chat&&$(".vm-head",chat);if(!head||$(".vxg-menubtn",head))return;
 head.insertAdjacentHTML("beforeend",'<button type="button" class="vm-ic vxg-menubtn" aria-label="More options" aria-haspopup="menu" hidden>'+DOTS+'</button>');
 $(".vxg-menubtn",head).addEventListener("click",e=>{e.stopPropagation();const b=e.currentTarget;
  /* Verified Veltrix Support chat, admin account: the three dots open the "switch dashboard" pop-up */
  if(sel){try{openSelPop(b)}catch(err){console.error(err)}return}
  if(sw){try{openSwitchPop(b)}catch(err){console.error(err)}return}
  try{if(typeof api.onClick==="function")api.onClick(b,peer);else openPop(b)}catch(err){console.error(err)}
  try{document.dispatchEvent(new CustomEvent("vx-chat-menu",{detail:{button:b,chat:peer}}))}catch(err){}})}
function onChat(p){closePop();sel=null;mountTab();sw=(p&&p.support&&(document.documentElement.classList.contains("admin-page")||isAdminAccount()))?switchTarget():null;peer=p&&!p.support?p:null;const chat=document.getElementById("vmChat"),btn=chat&&$(".vxg-menubtn",chat);baseHidden=sw?false:(!peer||!!peer.support||(!peer.real&&!peer.admin));if(btn){btn.hidden=baseHidden;btn.classList.remove("vxg-float")}}
const api={onChat,onClick:null,setSelection};
window.vxChatMenu=api;
})();
