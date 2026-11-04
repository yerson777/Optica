<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;

class NotificationService
{
    public function pendingAlertDays(): int
    {
        return Setting::intValue(Setting::PENDING_ALERT_DAYS, 5);
    }

    public function notifyReady(Order $order): void
    {
        $order->loadMissing('client');

        $clientName = $order->client?->full_name ?? 'Cliente';
        $message = "El pedido #{$order->id} de {$clientName} está listo para entregar.";

        foreach ($this->activeUsers() as $user) {
            Notification::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                    'type' => Notification::TYPE_READY,
                ],
                [
                    'message' => $message,
                ]
            );
        }
    }

    public function syncOverdueNotifications(): int
    {
        $days = $this->pendingAlertDays();
        $overdueLimit = now()->subDays($days)->toDateString();
        $staleDays = $days * 2;
        $staleLimit = now()->subDays($staleDays)->toDateString();

        $orders = Order::query()
            ->with('client')
            ->where('status', Order::STATUS_PENDING)
            ->whereDate('ordered_at', '<=', $overdueLimit)
            ->get();

        $users = $this->activeUsers();
        $created = 0;

        foreach ($orders as $order) {
            $clientName = $order->client?->full_name ?? 'Cliente';
            $overdueMessage = "El pedido #{$order->id} de {$clientName} lleva más de {$days} días pendiente.";

            foreach ($users as $user) {
                $notification = Notification::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'order_id' => $order->id,
                        'type' => Notification::TYPE_OVERDUE,
                    ],
                    ['message' => $overdueMessage]
                );

                if ($notification->wasRecentlyCreated) {
                    $created++;
                }

                if ($order->ordered_at->toDateString() <= $staleLimit) {
                    $staleMessage = "El pedido #{$order->id} de {$clientName} lleva demasiado tiempo sin completarse.";
                    $stale = Notification::firstOrCreate(
                        [
                            'user_id' => $user->id,
                            'order_id' => $order->id,
                            'type' => Notification::TYPE_STALE,
                        ],
                        ['message' => $staleMessage]
                    );

                    if ($stale->wasRecentlyCreated) {
                        $created++;
                    }
                }
            }
        }

        $readyOrders = Order::query()
            ->with('client')
            ->where('status', Order::STATUS_READY)
            ->where(function ($query) use ($staleLimit) {
                $query->whereDate('ready_at', '<=', $staleLimit)
                    ->orWhere(function ($inner) use ($staleLimit) {
                        $inner->whereNull('ready_at')
                            ->whereDate('ordered_at', '<=', $staleLimit);
                    });
            })
            ->get();

        foreach ($readyOrders as $order) {
            $clientName = $order->client?->full_name ?? 'Cliente';
            $message = "El pedido #{$order->id} de {$clientName} está listo hace varios días y aún no se entrega.";

            foreach ($users as $user) {
                $notification = Notification::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'order_id' => $order->id,
                        'type' => Notification::TYPE_STALE,
                    ],
                    ['message' => $message]
                );

                if ($notification->wasRecentlyCreated) {
                    $created++;
                }
            }
        }

        return $created;
    }

    public function resolveOrderNotifications(Order $order): void
    {
        Notification::query()
            ->where('order_id', $order->id)
            ->whereIn('type', [Notification::TYPE_READY, Notification::TYPE_OVERDUE, Notification::TYPE_STALE])
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function unreadCount(User $user): int
    {
        return Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();
    }

    private function activeUsers()
    {
        return User::query()->where('is_active', true)->get();
    }
}
