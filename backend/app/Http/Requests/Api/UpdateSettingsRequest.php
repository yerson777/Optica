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
            'pending_alert_days.required' => 'Indica la cantidad de días para avisar de un pedido pendiente.',
            'pending_alert_days.min' => 'El plazo mínimo es de 1 día.',
            'pending_alert_days.max' => 'El plazo máximo es de 60 días.',
        ];
    }
}
