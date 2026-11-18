// "Puerta de cuentas": antes de algo que no se puede deshacer (borrar el progreso,
// tocar las aperturas de clase…) hay que resolver 3 cuentas del curso. Así no pasa sin querer.
import { mathProblems } from './level';
import { mascotSvg } from './mascot';
import { sfx } from './sound';

export interface MathGateOptions {
  title: string;
  text: string;
  okLabel: string;
  danger?: boolean; // botón rojo (borrar)
}

/** Muestra las cuentas en `overlay`. Resuelve true si las acierta todas, false si cancela. */
export function mathGate(overlay: HTMLElement, course: number, o: MathGateOptions): Promise<boolean> {
  const problems = mathProblems(course);
  overlay.innerHTML = `
    <form class="card reset-card" novalidate>
      <div class="mascot">${mascotSvg('think')}</div>
      <h2>${o.title}</h2>
      <p>${o.text} Para hacerlo, resuelve estas 3 cuentas:</p>
      <div class="sums">
        ${problems
          .map(
            (p, i) => `<label class="sum"><span>${p.text} =</span>
              <input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" data-i="${i}" aria-label="Resultado de ${p.text}"/></label>`,
          )
          .join('')}
      </div>
      <p class="reset-msg" aria-live="polite"></p>
      <div class="row">
        <button type="button" class="btn" data-cancel>Mejor no</button>
        <button type="submit" class="btn ${o.danger ? 'danger' : 'primary'}">${o.okLabel}</button>
      </div>
    </form>`;
  overlay.classList.remove('hidden');
  return new Promise((resolve) => {
    overlay.querySelector('[data-cancel]')!.addEventListener('click', () => {
      overlay.classList.add('hidden');
      resolve(false);
    });
    overlay.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      overlay.querySelectorAll<HTMLInputElement>('input').forEach((inp, i) => {
        const right = inp.value.trim() !== '' && Number(inp.value) === problems[i].answer;
        inp.classList.toggle('wrong', !right);
        ok &&= right;
      });
      if (!ok) {
        sfx.error();
        overlay.querySelector('.reset-msg')!.textContent = 'Alguna cuenta no está bien. ¡Revisa las marcadas en rojo!';
        return;
      }
      sfx.hint();
      resolve(true);
    });
  });
}
