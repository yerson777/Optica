import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  notFutureDateValidator,
  passwordMatchValidator,
  phoneNumberValidator,
  trimmedRequired,
} from './field-validators';

function today(): string {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

describe('field validators', () => {
  it('rejects values with only spaces', () => {
    const control = new FormControl('   ');
    expect(trimmedRequired(control)).toEqual({ required: true });
    expect(trimmedRequired(new FormControl('María'))).toBeNull();
  });

  it('requires exactly 8 phone digits', () => {
    expect(phoneNumberValidator(new FormControl('123'))).toEqual({ phone: true });
    expect(phoneNumberValidator(new FormControl('+591 700 12345'))).toEqual({ phone: true });
    expect(phoneNumberValidator(new FormControl('12345678'))).toBeNull();
    expect(phoneNumberValidator(new FormControl('123456789'))).toEqual({ phone: true });
  });

  it('rejects future dates only', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const future = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, '0'),
      String(tomorrow.getDate()).padStart(2, '0'),
    ].join('-');

    expect(notFutureDateValidator(new FormControl(today()))).toBeNull();
    expect(notFutureDateValidator(new FormControl(future))).toEqual({
      futureDate: true,
    });
  });

  it('marks mismatched passwords on the confirmation field', () => {
    const form = new FormGroup(
      {
        password: new FormControl('ClaveSegura2026*', {
          validators: [Validators.required],
          nonNullable: true,
        }),
        password_confirmation: new FormControl('OtraClave2026*', {
          validators: [Validators.required],
          nonNullable: true,
        }),
      },
      { validators: passwordMatchValidator }
    );

    form.updateValueAndValidity();

    expect(form.controls.password_confirmation.errors?.['mismatch']).toBe(true);

    form.controls.password_confirmation.setValue('ClaveSegura2026*');
    form.updateValueAndValidity();

    expect(form.controls.password_confirmation.errors?.['mismatch']).toBeUndefined();
  });
});
