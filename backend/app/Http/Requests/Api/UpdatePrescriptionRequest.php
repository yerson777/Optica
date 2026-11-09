<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePrescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'observations' => $this->filled('observations') ? trim((string) $this->input('observations')) : null,
            'registered_at' => $this->input('registered_at') ?: now()->toDateString(),
        ]);
    }

    public function rules(): array
    {
        return [
            'observations' => ['nullable', 'string', 'max:2000'],
            'registered_at' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'registered_at.date_format' => __('messages.validation.prescriptions.registered_at_invalid'),
            'registered_at.before_or_equal' => __('messages.validation.prescriptions.registered_at_future'),
        ];
    }
}
