import { S, commit } from '../state.js';
import { setHTML, esc } from '../util/dom.js';
import { enabledGames } from '../domain.js';

export function renderStory(){
  const games = enabledGames();
  setHTML('storygrid', games.length ? games.map(g => `
    <div class="story" style="--gc:${esc(g.color)}">
      <span class="sn">${esc(g.short)}</span>
      <input value="${esc(S.story[g.id] ?? '')}" placeholder="— belum dicatat —"
             data-change="story:set" data-id="${esc(g.id)}" aria-label="Posisi story ${esc(g.short)}">
    </div>`).join('') : '<div class="empty">Belum ada game aktif.</div>');
}

export const changes = {
  'story:set'({ id }, el){
    S.story[id] = el.value.trim();
    commit();
  },
};
