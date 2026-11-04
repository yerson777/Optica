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
            'client_id.required' => 'Selecciona un cliente.',
            'client_id.exists' => 'El cliente seleccionado no existe.',
            'registered_at.date_format' => 'La fecha de la receta no es válida.',
            'registered_at.before_or_equal' => 'La fecha de la receta no puede ser futura.',
            'images.required' => 'Agrega al menos una fotografía de la receta.',
            'images.min' => 'Agrega al menos una fotografía de la receta.',
            'images.max' => 'Puedes subir como máximo 8 fotografías a la vez.',
            'images.*.mimes' => 'Cada fotografía debe ser JPG, JPEG, PNG o WEBP.',
            'images.*.max' => 'Cada fotografía debe pesar como máximo 10 MB.',
            'images.*.file' => 'El archivo seleccionado no es válido.',
        ];
    }
}
