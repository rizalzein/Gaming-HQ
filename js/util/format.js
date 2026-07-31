const LOCALE = 'id-ID';

export function rupiah(n){
  return 'Rp ' + Number(n || 0).toLocaleString(LOCALE);
}

export function longDate(date = new Date()){
  return date.toLocaleDateString(LOCALE, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

export function shortDate(iso){
  return new Date(iso + 'T00:00:00').toLocaleDateString(LOCALE, { day:'numeric', month:'short' });
}

export function monthLabel(ym){
  return new Date(ym + '-01T00:00:00').toLocaleDateString(LOCALE, { month:'long', year:'numeric' });
}

/** 480 → "UTC+8", -270 → "UTC-4:30" */
export function tzLabel(minutes){
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const mm = abs % 60;
  return `UTC${sign}${Math.floor(abs / 60)}${mm ? ':' + String(mm).padStart(2, '0') : ''}`;
}

/** "04:00" dari angka jam. */
export function hourLabel(hour){
  return String(hour).padStart(2, '0') + ':00';
}
