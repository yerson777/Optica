<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'full_name' => ['required', 'string', 'min:3', 'max:150', Rule::unique('clients', 'full_name')->ignore($this->route('client')->id)],
            'phone' => ['required', 'string', 'regex:/^\+?\d{6,15}$/', Rule::unique('clients', 'phone')->ignore($this->route('client')->id)],
            'observations' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.required' => __('messages.validation.clients.full_name_required'),
            'full_name.min' => __('messages.validation.clients.full_name_min'),
            'full_name.unique' => __('messages.validation.clients.full_name_unique'),
            'phone.required' => __('messages.validation.clients.phone_required'),
            'phone.regex' => __('messages.validation.clients.phone_regex'),
            'phone.unique' => __('messages.validation.clients.phone_unique'),
        ];
    }
}
