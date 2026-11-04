import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { User } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';
import { extractErrorMessage } from '../../core/utils/error-message';
import { passwordMatchValidator, trimmedRequired } from '../../core/validators/field-validators';
import { PagerComponent } from '../../shared/ui/pager.component';

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    PagerComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UserService);
  private readonly toast = inject(ToastService);

  @ViewChild(FormGroupDirective) private formDirective?: FormGroupDirective;

  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = 10;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), trimmedRequired]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9_-]+$/),
        trimmedRequired,
      ],
    ],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(255)]],
    password_confirmation: ['', [Validators.required, Validators.maxLength(255)]],
    is_active: [true],
  }, { validators: passwordMatchValidator });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);

    this.usersService.list(this.page(), this.pageSize).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.total.set(response.total);
        this.lastPage.set(response.last_page);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(extractErrorMessage(error, 'No se pudieron cargar los usuarios.'));
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.controls.password.value !== this.form.controls.password_confirmation.value) {
      this.form.controls.password_confirmation.setErrors({ mismatch: true });
      this.form.controls.password_confirmation.markAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();

    this.usersService
      .create({
        name: value.name.trim(),
        username: value.username.trim().toLowerCase(),
        password: value.password,
        password_confirmation: value.password_confirmation,
        is_active: value.is_active,
      })
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.toast.success(response.message || 'Usuario creado correctamente.');
          this.clearForm();
          this.page.set(1);
          this.loadUsers();
        },
        error: (error) => {
          this.saving.set(false);
          this.error.set(extractErrorMessage(error, 'No se pudo crear el usuario.'));
        },
      });
  }

  clearForm(): void {
    const emptyValue = {
      name: '',
      username: '',
      password: '',
      password_confirmation: '',
      is_active: true,
    };

    if (this.formDirective) {
      this.formDirective.resetForm(emptyValue);
    } else {
      this.form.reset(emptyValue);
    }

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity();
    this.error.set(null);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage() || page === this.page()) {
      return;
    }

    this.page.set(page);
    this.loadUsers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
