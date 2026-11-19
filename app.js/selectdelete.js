/* Veltrix – press and hold to select, then delete from the bottom bar (messages, conversations, notifications).
   Press and hold a row to select it (it is highlighted and gets a tick circle, like the file picker). Once something is selected a tap
   adds / removes other rows. A delete button appears at the bottom-left of the screen; tapping it asks the page to open its own
   confirm pop-up (Delete / Cancel). The page decides what "delete" means, this file only handles the selecting. */
(function(){
 "use strict";
 var TRASH='<svg class="vx-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/></svg>';
 var PEN='<svg class="vx-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="m13.498.795.149-.149a1.207 1.207 0 1 1 1.707 1.708l-.149.148a1.5 1.5 0 0 1-.059 2.059L4.854 14.854a.5.5 0 0 1-.233.131l-4 1a.5.5 0 0 1-.606-.606l1-4a.5.5 0 0 1 .131-.232l9.642-9.642a.5.5 0 0 0-.642.056L6.854 4.854a.5.5 0 1 1-.708-.708L9.44.854A1.5 1.5 0 0 1 11.5.796a1.5 1.5 0 0 1 1.998-.001"/></svg>';
 /* o.container  – element that holds the rows (re-rendered by the page whenever it likes)
    o.rowSel     – selector of one selectable row        o.idOf(row) – stable id of a row
    o.host       – screen the bar lives in (default: the closest messaging / feature page)
    o.onDelete(ids,finish) – open the confirm pop-up; call finish() after the delete went through
    o.extra(id)  – optional: {label,run} for a second button (bottom-right) while exactly one row is selected */
 function attach(o){
  var box=o&&o.container;if(!box||box.__vxSel)return box&&box.__vxSel;
  var host=o.host||box.closest(".vm-page,.wd-feature-page")||document.body;
  var ids=new Set(),list=function(){return Array.from(ids)},bar=null,timer=null,fired=false,x0=0,y0=0;
  var rows=function(){return [].slice.call(box.querySelectorAll(o.rowSel))};
  var idOf=function(r){return o.idOf(r)};
  /* the delete (and edit) buttons live in the header of the screen the rows are on, never at the bottom */
  function headerOf(){return o.header?host.querySelector(o.header):(host.querySelector(":scope > header")||host.querySelector("header"))}
  function ensureBar(){
   if(bar)return bar;
   bar=document.createElement("span");bar.className="vx-selbar";bar.hidden=true;bar.setAttribute("role","toolbar");
   bar.innerHTML='<button type="button" class="vx-selbtn vx-selext" hidden></button><button type="button" class="vx-selbtn vx-seldel" aria-label="'+(o.label||"Delete")+'">'+TRASH+'</button>';
   var hd=headerOf();
   if(hd){var anchor=hd.querySelector(".vxg-menubtn,.wd-notification-filter");if(anchor&&anchor.parentNode===hd)hd.insertBefore(bar,anchor);else hd.appendChild(bar)}
   else host.appendChild(bar);
   bar.querySelector(".vx-seldel").addEventListener("click",function(e){e.stopPropagation();if(ids.size)o.onDelete(list(),clear)});
   bar.querySelector(".vx-selext").addEventListener("click",function(e){e.stopPropagation();var x=ids.size===1&&o.extra&&o.extra(list()[0]);if(x)x.run()});
   return bar;
  }
  var ro=null;
  function place(){}
  function paint(){
   var on=ids.size>0;
   box.classList.toggle("vx-selmode",on);
   rows().forEach(function(r){var s=on&&ids.has(idOf(r));r.classList.toggle("vx-selrow",on);r.classList.toggle("vx-selected",s);if(on)r.setAttribute("aria-selected",String(s));else r.removeAttribute("aria-selected")});
   var x=on&&ids.size===1&&o.extra?o.extra(list()[0]):null;
   /* o.onSelect({count,del,edit}) / null – lets a page (the chat's three-dot menu) offer delete / edit itself; o.hideBar:true keeps the bottom bar away */
   if(o.onSelect){try{o.onSelect(on?{count:ids.size,del:function(){if(ids.size)o.onDelete(list(),clear)},edit:x||null}:null)}catch(e){console.error(e)}}
   if(o.hideBar)return;
   if(!on&&!bar)return;
   var b=ensureBar();b.hidden=!on;
   var ext=b.querySelector(".vx-selext");
   ext.hidden=!x;if(x){ext.innerHTML=PEN;ext.setAttribute("aria-label",x.label||"Edit")}
   place();
  }
  function clear(){ids.clear();clearTimeout(timer);timer=null;paint()}
  function add(r){var id=idOf(r);if(id==null||id==="")return;ids.add(id);paint()}
  function toggle(r){var id=idOf(r);if(id==null||id==="")return;if(ids.has(id))ids.delete(id);else ids.add(id);paint()}
  function pick(r){if(!r||!box.contains(r))return null;return o.canSelect&&!o.canSelect(r)?null:r}
  function stopTimer(){clearTimeout(timer);timer=null}
  box.addEventListener("pointerdown",function(e){
   if(e.pointerType==="mouse"&&e.button!==0)return;
   var r=pick(e.target.closest&&e.target.closest(o.rowSel));fired=false;stopTimer();if(!r||ids.size)return;
   x0=e.clientX;y0=e.clientY;
   timer=setTimeout(function(){timer=null;fired=true;try{navigator.vibrate&&navigator.vibrate(15)}catch(x){}add(r)},o.ms||500);
  },true);
  box.addEventListener("pointermove",function(e){if(timer&&(Math.abs(e.clientX-x0)>10||Math.abs(e.clientY-y0)>10))stopTimer()},true);
  ["pointerup","pointercancel","pointerleave"].forEach(function(n){box.addEventListener(n,stopTimer,true)});
  document.addEventListener("scroll",stopTimer,true);
  /* right-click / the phone's own long-press menu selects too (and never opens the browser menu on a row) */
  box.addEventListener("contextmenu",function(e){var r=pick(e.target.closest&&e.target.closest(o.rowSel));if(!r)return;e.preventDefault();stopTimer();fired=true;add(r)},true);
  /* the tap that ends a long-press must not also open the row; while selecting, a tap only adds / removes the row */
  box.addEventListener("click",function(e){
   var r=pick(e.target.closest&&e.target.closest(o.rowSel));
   if(fired){fired=false;if(r){e.stopPropagation();e.preventDefault()}return}
   if(!ids.size||!r)return;
   e.stopPropagation();e.preventDefault();toggle(r);
  },true);
  /* the page re-renders its rows: keep the selection on the rows that still exist, drop the rest */
  new MutationObserver(function(){
   if(!ids.size)return;
   var have=new Set(rows().map(idOf)),gone=false;
   ids.forEach(function(id){if(!have.has(id)){ids.delete(id);gone=true}});
   paint();
  }).observe(box,{childList:true,subtree:true});
  /* leaving the screen ends the selection */
  new MutationObserver(function(){if(host.hidden)clear()}).observe(host,{attributes:true,attributeFilter:["hidden"]});
  document.addEventListener("keydown",function(e){
   if(e.key!=="Escape"||!ids.size||host.hidden)return;
   if(document.querySelector("#vmDialog:not([hidden]),.sx-dlg"))return;
   e.stopImmediatePropagation();clear();
  },true);
  var api={clear:clear,count:function(){return ids.size}};
  box.__vxSel=api;return api;
 }
 window.veltrixSelect={attach:attach};
})();

/* Block the browser's own press-and-hold text selection and context menu everywhere except typing fields.
   Listeners only call preventDefault (never stopPropagation), so the app's own press-and-hold handlers keep working. */
(function(){
 "use strict";
 function editable(t){
  if(!t||!t.closest)return false;
  return !!t.closest('input,textarea,[contenteditable=""],[contenteditable="true"]');
 }
 document.addEventListener("contextmenu",function(e){if(!editable(e.target))e.preventDefault()});
 document.addEventListener("selectstart",function(e){var t=e.target&&e.target.nodeType===3?e.target.parentNode:e.target;if(!editable(t))e.preventDefault()});
})();
