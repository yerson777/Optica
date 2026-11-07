<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pending_alert_days' => ['required', 'integer', 'min:1', 'max:60'],
        ];
    }

    public function messages(): array
    {
        return [
            'pending_alert_days.required' => __('messages.validation.settings.days_required'),
            'pending_alert_days.min' => __('messages.validation.settings.days_min'),
            'pending_alert_days.max' => __('messages.validation.settings.days_max'),
        ];
    }
}
