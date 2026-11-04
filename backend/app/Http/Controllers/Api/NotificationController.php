<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $this->notifications->syncOverdueNotifications();

        $perPage = min(50, max(5, (int) $request->query('per_page', 20)));
        $onlyUnread = $request->boolean('unread');

        $paginator = Notification::query()
            ->with(['order.client:id,full_name,phone', 'order:id,status,ordered_at,delivered_at'])
            ->where('user_id', $request->user()->id)
            ->when($onlyUnread, fn ($q) => $q->whereNull('read_at'))
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        $payload = $paginator->toArray();
        $payload['unread_count'] = $this->notifications->unreadCount($request->user());

        return response()->json($payload);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $this->notifications->syncOverdueNotifications();

        return response()->json([
            'data' => [
                'count' => $this->notifications->unreadCount($request->user()),
            ],
        ]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 404);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['data' => $notification->fresh()]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        Notification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Todos los avisos se marcaron como leídos.']);
    }
}
