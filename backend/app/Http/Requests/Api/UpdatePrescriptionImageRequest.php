<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePrescriptionImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => __('messages.validation.prescriptions.image_select_required'),
            'image.mimes' => __('messages.validation.prescriptions.image_mimes'),
            'image.max' => __('messages.validation.prescriptions.image_max_size'),
            'image.file' => __('messages.validation.prescriptions.image_file'),
        ];
    }
}
