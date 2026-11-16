import { Item } from './supabase'

export type OutfitWidgetState = {
  id: string
  status: 'ready' | 'worn' | 'rejected'
  items: Array<{ name: string, category: string }>
}

const categoryIcon: Record<string, string> = {
  'Верх': '👕', 'Низ': '👖', 'Обувь': '👟', 'Верхняя одежда': '🧥',
  'Платье': '👗', 'Комплект': '✨', 'Сумка': '👜', 'Аксессуар': '💍', 'Купальник': '🩱',
}

export function outfitWidgetState(id: string, items: Item[], status: OutfitWidgetState['status'] = 'ready'): OutfitWidgetState {
  return {
    id,
    status,
    items: items.slice(0, 8).map((item) => ({
      category: item.category,
      name: `${categoryIcon[item.category] || '•'} ${item.custom_name || item.description || item.subcategory || item.category}`.slice(0, 52),
    })),
  }
}

export function outfitWidgetHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:14px;font-family:system-ui;color:var(--tg-theme-text-color)}
h3{margin:0 0 4px;font-size:1.08em}.hint{color:var(--tg-theme-hint-color);font-size:.86em;margin-bottom:10px}
#items{display:grid;grid-template-columns:1fr 1fr;gap:7px}.item{padding:9px;border-radius:12px;background:var(--tg-theme-secondary-bg-color);min-width:0}
.cat{font-size:.72em;color:var(--tg-theme-hint-color)}.name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px}button{min-height:38px;border:0;border-radius:11px;font-weight:650}
.primary{background:var(--tg-theme-button-color);color:var(--tg-theme-button-text-color)}.secondary{background:var(--tg-theme-secondary-bg-color);color:var(--tg-theme-text-color)}
.wide{grid-column:1/-1}.done{text-align:center;padding:18px 4px}.error{color:var(--tg-theme-destructive-text-color);font-size:.82em;margin-top:7px}
</style></head><body><div id="app"></div><script>
const W=TelegramWidget,app=document.getElementById('app');let busy=false;
function state(){try{return JSON.parse(W.chatData)}catch(e){return null}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){const s=state();if(!s){app.innerHTML='<div class="done">Образ недоступен</div>';return}
if(s.status==='worn'){app.innerHTML='<div class="done"><h3>Образ отмечен ✨</h3><div class="hint">Вечером уточню про стирку</div></div>';return}
if(s.status==='rejected'){app.innerHTML='<div class="done"><h3>Поняла, это не твоё</h3><div class="hint">Такое сочетание больше не предложу</div></div>';return}
app.innerHTML='<h3>Образ на сегодня</h3><div class="hint">Можно решить прямо здесь</div><div id="items">'+s.items.map(i=>'<div class="item"><div class="cat">'+esc(i.category)+'</div><div class="name">'+esc(i.name)+'</div></div>').join('')+'</div><div class="actions"><button class="primary" data-a="wear">Надену сегодня</button><button class="secondary" data-a="next">Другой образ</button><button class="secondary" data-a="nope">Не моё</button><button class="secondary" id="open">Открыть гардероб</button></div><div id="msg" class="error"></div>';
app.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>ask(b.dataset.a,s.id));document.getElementById('open').onclick=()=>W.openLink('https://digital-wardrobe-gilt.vercel.app/recommend')}
function ask(a,id){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);const m=document.getElementById('msg');if(m)m.textContent='Сохраняю…';W.request('w:'+a+':'+id).then(x=>{busy=false;if(x.result){try{const d=JSON.parse(x.result);if(d.error&&m)m.textContent=d.error}catch(e){}}render()},e=>{busy=false;render();const n=document.getElementById('msg');if(n)n.textContent=e.code==='RATE_LIMITED'?'Слишком быстро — попробуй ещё раз':'Не получилось — попробуй ещё раз'} )}
W.onEvent('chatDataChanged',render);render();W.ready();
</script></body></html>`
}

export function parseOutfitWidgetAction(value: string) {
  const match = /^w:(wear|next|nope):([0-9a-f]{8}-[0-9a-f-]{27})$/i.exec(value)
  return match ? { action: match[1] as 'wear' | 'next' | 'nope', sessionId: match[2] } : null
}
