<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => preg_replace('/\s+/', ' ', trim((string) $this->input('name'))),
            'username' => strtolower(trim((string) $this->input('username'))),
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:100'],
            'username' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'regex:/^[a-z0-9_-]+$/',
                'unique:users,username',
            ],
            'password' => ['required', 'confirmed', 'max:255', Password::min(8)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => __('messages.validation.users.name_required'),
            'name.min' => __('messages.validation.users.name_min'),
            'username.required' => __('messages.validation.users.username_required'),
            'username.min' => __('messages.validation.users.username_min'),
            'username.regex' => __('messages.validation.users.username_regex'),
            'username.unique' => __('messages.validation.users.username_unique'),
            'password.required' => __('messages.validation.users.password_required'),
            'password.confirmed' => __('messages.validation.users.password_confirmed'),
            'password.min' => __('messages.validation.users.password_min'),
        ];
    }
}
