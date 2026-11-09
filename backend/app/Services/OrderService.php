<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly AuditService $audit,
    ) {}

    public function create(array $data, User $user): Order
    {
        $order = DB::transaction(function () use ($data, $user) {
            $order = Order::create([
                'client_id' => $data['client_id'],
                'prescription_id' => $data['prescription_id'],
                'lens_type' => $data['lens_type'],
                'observations' => $data['observations'] ?? null,
                'price' => $data['price'] ?? null,
                'advance' => $data['advance'] ?? null,
                'status' => Order::STATUS_PENDING,
                'ordered_at' => $data['ordered_at'],
                'created_by' => $user->id,
            ]);

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => Order::STATUS_PENDING,
                'changed_by' => $user->id,
                'note' => 'Pedido creado.',
                'created_at' => now(),
            ]);

            $this->audit->log(
                'order.created',
                "Creó el pedido #{$order->id}",
                $order,
                ['lens_type' => $order->lens_type],
                $user->id
            );

            return $order;
        });

        return $this->loadOrder($order);
    }

    public function updateStatus(Order $order, string $status, User $user, ?string $note = null): Order
    {
        $order = DB::transaction(function () use ($order, $status, $user, $note) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $locked->status;

            if ($from === $status) {
                throw ValidationException::withMessages([
                    'status' => __('messages.orders.same_status'),
                ]);
            }

            $allowed = [
                Order::STATUS_PENDING => [Order::STATUS_READY, Order::STATUS_CANCELLED],
                Order::STATUS_READY => [Order::STATUS_DELIVERED, Order::STATUS_CANCELLED, Order::STATUS_PENDING],
                Order::STATUS_DELIVERED => [],
                Order::STATUS_CANCELLED => [],
            ];

            if (! in_array($status, $allowed[$from] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => __('messages.orders.invalid_transition', [
                        'from' => Order::STATUS_LABELS[$from],
                        'to' => Order::STATUS_LABELS[$status],
                    ]),
                ]);
            }

            $updates = ['status' => $status];

            if ($status === Order::STATUS_READY) {
                $updates['ready_at'] = now();
                $updates['delivered_at'] = null;
                $updates['delivered_by'] = null;
            }

            if ($status === Order::STATUS_PENDING) {
                $updates['ready_at'] = null;
                $updates['delivered_at'] = null;
                $updates['delivered_by'] = null;
            }

            if ($status === Order::STATUS_DELIVERED) {
                $updates['ready_at'] = $locked->ready_at ?? now();
                $updates['delivered_at'] = now();
                $updates['delivered_by'] = $user->id;
            }

            $locked->update($updates);

            OrderStatusHistory::create([
                'order_id' => $locked->id,
                'from_status' => $from,
                'to_status' => $status,
                'changed_by' => $user->id,
                'note' => $note,
                'created_at' => now(),
            ]);

            $this->audit->log(
                'order.status_changed',
                "Cambió el pedido #{$locked->id} a ".Order::STATUS_LABELS[$status],
                $locked,
                ['from' => $from, 'to' => $status],
                $user->id
            );

            return $locked;
        });

        if ($status === Order::STATUS_READY) {
            $this->notifications->notifyReady($order);
        }

        if (in_array($status, [Order::STATUS_DELIVERED, Order::STATUS_CANCELLED], true)) {
            $this->notifications->resolveOrderNotifications($order);
        }

        return $this->loadOrder($order);
    }

    public function destroy(Order $order, User $user): void
    {
        DB::transaction(function () use ($order, $user) {
            $order->delete();

            $this->audit->log(
                'order.deleted',
                "Eliminó el pedido #{$order->id}",
                $order,
                ['order_id' => $order->id],
                $user->id
            );
        });
    }

    private function loadOrder(Order $order): Order
    {
        return $order->fresh()->load([
            'client',
            'prescription.images',
            'creator',
            'deliveryUser',
            'statusHistories.changer',
        ]);
    }
}
