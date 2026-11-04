import { AbstractControl, ValidationErrors } from '@angular/forms';

export function trimmedRequired(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.trim().length === 0) {
    return { required: true };
  }

  return null;
}

export function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  const digits = value.replace(/\D/g, '');

  if (digits.length < 6 || digits.length > 15) {
    return { phone: true };
  }

  return null;
}

export function notFutureDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }

  const today = new Date();
  const todayValue = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  return String(control.value) <= todayValue ? null : { futureDate: true };
}

export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmation = control.get('password_confirmation');

  if (!password || !confirmation) {
    return null;
  }

  const errors = confirmation.errors ?? {};

  if (password.value && confirmation.value && password.value !== confirmation.value) {
    confirmation.setErrors({ ...errors, mismatch: true });
  } else if (errors['mismatch']) {
    const remaining = { ...errors };
    delete remaining['mismatch'];
    confirmation.setErrors(Object.keys(remaining).length > 0 ? remaining : null);
  }

  return null;
}
