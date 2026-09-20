/**
 * Fake `@minecraft/server-ui`.
 *
 * `show()` is programmable: a test can queue the responses it wants the engine
 * to receive, which is how the busy-retry path gets exercised without a real
 * player tapping a real screen.
 */
const queued = [];
const shown = [];

export function queueResponse(response) {
  queued.push(response);
}

export function shownForms() {
  return shown;
}

export function resetUi() {
  queued.length = 0;
  shown.length = 0;
}

class FormData {
  constructor() {
    this.kind = 'action';
    this.buttons = [];
    this.titleText = '';
    this.bodyText = '';
    this.fields = [];
  }
  title(value) {
    this.titleText = value;
    return this;
  }
  body(value) {
    this.bodyText = value;
    return this;
  }
  button(value, icon) {
    this.buttons.push({ text: value, icon });
    return this;
  }
  textField(label, placeholder) {
    this.fields.push({ kind: 'text', label, placeholder });
    return this;
  }
  slider(label, min, max, step, value) {
    this.fields.push({ kind: 'slider', label, min, max, step, value });
    return this;
  }
  toggle(label, value) {
    this.fields.push({ kind: 'toggle', label, value });
    return this;
  }
  dropdown(label, options, index) {
    this.fields.push({ kind: 'dropdown', label, options, index });
    return this;
  }
  show() {
    shown.push(this);
    const next = queued.shift();
    if (next === undefined) return Promise.resolve({ canceled: true, cancelationReason: 'UserClosed' });
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next);
  }
}

export class ActionFormData extends FormData {}
export class ModalFormData extends FormData {}
export class MessageFormData extends FormData {}

export const FormCancelationReason = {
  UserBusy: 'UserBusy',
  UserClosed: 'UserClosed',
};