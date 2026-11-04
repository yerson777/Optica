<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Notification;
use App\Models\Order;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $this->notifications->syncOverdueNotifications();

        $user = $request->user();
        $startOfMonth = now()->startOfMonth();

        $stats = [
            'total_clients' => Client::query()->count(),
            'pending_orders' => Order::query()->where('status', Order::STATUS_PENDING)->count(),
            'ready_orders' => Order::query()->where('status', Order::STATUS_READY)->count(),
            'delivered_this_month' => Order::query()
                ->where('status', Order::STATUS_DELIVERED)
                ->where('delivered_at', '>=', $startOfMonth)
                ->count(),
        ];

        $alerts = Notification::query()
            ->with(['order.client'])
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->orderByDesc('created_at')
            ->limit(6)
            ->get();

        $recentOrders = Order::query()
            ->with(['client:id,full_name,phone'])
            ->whereIn('status', [Order::STATUS_PENDING, Order::STATUS_READY])
            ->orderBy('ordered_at')
            ->orderBy('id')
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'stats' => $stats,
                'alerts' => $alerts,
                'unread_notifications' => $this->notifications->unreadCount($user),
                'recent_orders' => $recentOrders,
                'pending_alert_days' => $this->notifications->pendingAlertDays(),
            ],
        ]);
    }
}
