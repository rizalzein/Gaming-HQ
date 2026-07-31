import { commit } from '../state.js';
import { setHTML, esc } from '../util/dom.js';
import { enabledGames, pityOf, setPity } from '../domain.js';

export function renderPity(){
  const games = enabledGames().filter(g => g.banners.length);

  setHTML('pitygrid', games.length ? games.map(g => `
    <div class="pity-game" style="--gc:${esc(g.color)}">
      <div class="pgname">${esc(g.name)}</div>
      <div class="pity-rows">${g.banners.map(b => bannerRow(g, b)).join('')}</div>
    </div>`).join('') : '<div class="empty">Belum ada banner. Atur lewat ◈ 08 Pengaturan → pilih game.</div>');
}

function bannerRow(game, banner){
  const { count, guaranteed } = pityOf(game.id, banner.id);
  const hard = Number(banner.hard) || 90;
  const soft = Number(banner.soft) || 0;
  const pct = Math.min(100, count / hard * 100);
  const inSoft = soft > 0 && count >= soft;

  return `<div class="pity">
    <span class="pn">${esc(banner.label)}</span>
    <input type="number" min="0" max="999" value="${count || ''}" placeholder="0"
           data-change="pity:count" data-game="${esc(game.id)}" data-banner="${esc(banner.id)}"
           aria-label="Pity ${esc(banner.label)} ${esc(game.short)}">
    <span class="pmax">/ ${hard}${inSoft ? ' · soft' : ''}</span>
    ${banner.fifty ? `<button type="button" class="fifty ${guaranteed ? 'guar' : ''}"
        data-act="pity:fifty" data-game="${esc(game.id)}" data-banner="${esc(banner.id)}"
        title="Status 50/50">${guaranteed ? 'DIJAMIN' : '50/50'}</button>` : ''}
    <div class="pbar"><i class="${inSoft ? 'soft' : ''}" style="width:${pct}%"></i></div>
  </div>`;
}

export const actions = {
  'pity:fifty'({ game, banner }){
    setPity(game, banner, { guaranteed: !pityOf(game, banner).guaranteed });
    commit();
  },
};

export const changes = {
  'pity:count'({ game, banner }, el){
    const n = el.value === '' ? 0 : Math.max(0, Number(el.value) || 0);
    setPity(game, banner, { count: n });
    commit();
  },
};
