<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $phone = preg_replace('/[^\d+]/', '', (string) $this->input('phone'));

        $this->merge([
            'full_name' => preg_replace('/\s+/', ' ', trim((string) $this->input('full_name'))),
            'phone' => $phone,
            'observations' => $this->filled('observations') ? trim((string) $this->input('observations')) : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'min:3', 'max:150'],
            'phone' => ['required', 'string', 'regex:/^\+?\d{6,15}$/'],
            'observations' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'El nombre del cliente es obligatorio.',
            'full_name.min' => 'El nombre debe tener al menos 3 letras.',
            'phone.required' => 'El celular es obligatorio.',
            'phone.regex' => 'Escribe un número de celular válido (solo números, entre 6 y 15 dígitos).',
        ];
    }
}
