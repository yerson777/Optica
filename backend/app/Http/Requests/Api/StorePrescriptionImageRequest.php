<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StorePrescriptionImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'images' => ['required', 'array', 'min:1', 'max:8'],
            'images.*' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'images.required' => 'Selecciona al menos una fotografía.',
            'images.*.mimes' => 'Cada fotografía debe ser JPG, JPEG, PNG o WEBP.',
            'images.*.max' => 'Cada fotografía debe pesar como máximo 10 MB.',
        ];
    }
}
