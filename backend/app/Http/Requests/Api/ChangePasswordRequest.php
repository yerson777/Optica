<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', 'max:255', Password::min(8)],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => __('messages.validation.auth.current_password_required'),
            'password.required' => __('messages.validation.auth.new_password_required'),
            'password.confirmed' => __('messages.validation.auth.passwords_mismatch'),
            'password.min' => __('messages.validation.auth.password_min'),
        ];
    }
}
