import { S, commit, uid } from '../state.js';
import { setHTML, setText, esc, byId, clearInputs } from '../util/dom.js';
import { rupiah, monthLabel } from '../util/format.js';
import { localDayKey } from '../util/date.js';
import { openModal, field, input } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

const currentMonth = () => localDayKey().slice(0, 7);

export function renderBudget(){
  const month = currentMonth();
  const entries = S.budget.months[month] ?? [];
  const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const cap = S.budget.cap;
  const over = cap > 0 && total > cap;

  setText('bud-month-label', 'bulan ' + monthLabel(month));
  setText('bud-capline', cap > 0 ? `dari plafon ${rupiah(cap)}` : 'tanpa plafon');

  const totalEl = byId('bud-total');
  totalEl.textContent = rupiah(total);
  totalEl.classList.toggle('over', over);

  setText('bud-sisa', cap <= 0 ? '' : over ? `⚠ lewat plafon ${rupiah(total - cap)}` : `sisa ${rupiah(cap - total)}`);

  const bar = byId('bud-bar');
  bar.style.width = cap > 0 ? Math.min(100, total / cap * 100) + '%' : '0%';
  bar.classList.toggle('over', over);

  setHTML('bud-entries', entries.length ? entries.map(e => `
    <div class="bud-e">
      <span class="lbl">${esc(e.label)}</span>
      <span>
        <span class="amt">${esc(rupiah(e.amount))}</span>
        <button type="button" class="del" data-act="budget:delete" data-id="${esc(e.id)}" title="Hapus">✕</button>
      </span>
    </div>`).join('') : '<div class="note" style="margin:0">Belum ada top-up bulan ini — dompet aman. 👍</div>');

  renderHistory(month);
}

function renderHistory(currentKey){
  const rows = Object.entries(S.budget.months)
    .filter(([key, list]) => key !== currentKey && list?.length)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([key, list]) => {
      const sum = list.reduce((s, e) => s + Number(e.amount || 0), 0);
      return `${monthLabel(key)}: ${rupiah(sum)}`;
    });

  setHTML('bud-history', rows.length ? 'Riwayat — ' + rows.map(esc).join(' · ') : '');
}

export const actions = {
  'budget:delete'({ id }){
    const month = currentMonth();
    S.budget.months[month] = (S.budget.months[month] ?? []).filter(e => e.id !== id);
    commit();
  },
  'budget:editCap'(){
    openModal({
      title: 'Plafon top-up bulanan',
      body: field('Plafon (Rp)', input('cap', S.budget.cap, 'type="number" min="0" step="10000"'),
                  'Isi 0 untuk menonaktifkan plafon dan peringatan lewat batas.'),
      onConfirm(form){
        const cap = Number(form.cap.value);
        if (!Number.isFinite(cap) || cap < 0){ form.cap.focus(); return false; }
        S.budget.cap = cap;
        commit();
      },
    });
  },
};

export const submits = {
  'bud-form'(){
    const label = byId('bud-lbl').value.trim();
    const amount = Number(byId('bud-amt').value);
    if (!label || !Number.isFinite(amount) || amount <= 0){
      toast('Isi keterangan dan nominalnya dulu.', 'err');
      return;
    }
    const month = currentMonth();
    (S.budget.months[month] ??= []).push({ id: uid(), label, amount });
    clearInputs('bud-lbl', 'bud-amt');
    commit();
  },
};
