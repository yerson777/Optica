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
            'images.required' => __('messages.validation.prescriptions.images_select_required'),
            'images.*.mimes' => __('messages.validation.prescriptions.image_mimes'),
            'images.*.max' => __('messages.validation.prescriptions.image_max_size'),
        ];
    }
}
