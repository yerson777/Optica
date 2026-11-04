<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UpdateSettingsRequest;
use App\Models\Setting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'pending_alert_days' => Setting::intValue(Setting::PENDING_ALERT_DAYS, 5),
            ],
        ]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $days = $request->integer('pending_alert_days');

        Setting::setValue(Setting::PENDING_ALERT_DAYS, (string) $days);

        $this->audit->log(
            'settings.updated',
            "Configuró el aviso de pedidos pendientes a {$days} días",
            null,
            ['pending_alert_days' => $days]
        );

        return response()->json([
            'data' => ['pending_alert_days' => $days],
            'message' => 'Configuración guardada correctamente.',
        ]);
    }
}
