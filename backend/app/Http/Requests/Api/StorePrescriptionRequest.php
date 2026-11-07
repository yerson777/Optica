<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StorePrescriptionRequest extends FormRequest
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
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'observations' => ['nullable', 'string', 'max:2000'],
            'registered_at' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'images' => ['required', 'array', 'min:1', 'max:8'],
            'images.*' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'client_id.required' => __('messages.validation.prescriptions.client_required'),
            'client_id.exists' => __('messages.validation.prescriptions.client_exists'),
            'registered_at.date_format' => __('messages.validation.prescriptions.registered_at_invalid'),
            'registered_at.before_or_equal' => __('messages.validation.prescriptions.registered_at_future'),
            'images.required' => __('messages.validation.prescriptions.images_required'),
            'images.min' => __('messages.validation.prescriptions.images_required'),
            'images.max' => __('messages.validation.prescriptions.images_max'),
            'images.*.mimes' => __('messages.validation.prescriptions.image_mimes'),
            'images.*.max' => __('messages.validation.prescriptions.image_max_size'),
            'images.*.file' => __('messages.validation.prescriptions.image_file'),
        ];
    }
}
