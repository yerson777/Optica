<?php

namespace App\Http\Requests\Api;

use App\Models\Prescription;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'lens_type' => trim((string) $this->input('lens_type')),
            'observations' => $this->filled('observations') ? trim((string) $this->input('observations')) : null,
            'ordered_at' => $this->input('ordered_at') ?: now()->toDateString(),
            'price' => $this->filled('price') ? $this->input('price') : null,
            'advance' => $this->filled('advance') ? $this->input('advance') : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'prescription_id' => ['required', 'integer', 'exists:prescriptions,id'],
            'lens_type' => ['required', 'string', 'max:100'],
            'observations' => ['nullable', 'string', 'max:2000'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'advance' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'ordered_at' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $prescription = Prescription::query()->find($this->integer('prescription_id'));

            if ($prescription && $prescription->client_id !== $this->integer('client_id')) {
                $validator->errors()->add(
                    'prescription_id',
                    __('messages.validation.orders.prescription_not_owned')
                );
            }

            $price = $this->input('price');
            $advance = $this->input('advance');

            if ($price !== null && $advance !== null && (float) $advance > (float) $price) {
                $validator->errors()->add('advance', __('messages.validation.orders.advance_gt_price'));
            }
        });
    }

    public function messages(): array
    {
        return [
            'client_id.required' => __('messages.validation.orders.client_required'),
            'prescription_id.required' => __('messages.validation.orders.prescription_required'),
            'prescription_id.exists' => __('messages.validation.orders.prescription_exists'),
            'lens_type.required' => __('messages.validation.orders.lens_type_required'),
            'price.numeric' => __('messages.validation.orders.price_numeric'),
            'advance.numeric' => __('messages.validation.orders.advance_numeric'),
            'ordered_at.before_or_equal' => __('messages.validation.orders.ordered_at_future'),
        ];
    }
}
