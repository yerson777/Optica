<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreOrderRequest;
use App\Http\Requests\Api\UpdateOrderStatusRequest;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'string', Rule::in(Order::STATUSES)],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:50'],
        ]);

        $perPage = min(50, max(5, (int) $request->query('per_page', 15)));

        $orders = Order::query()
            ->with([
                'client:id,full_name,phone',
                'prescription:id,registered_at',
                'creator:id,name',
                'deliveryUser:id,name',
            ])
            ->filterStatus($request->query('status'))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->integer('client_id')))
            ->orderedBetween($request->query('from'), $request->query('to'))
            ->search($request->query('search'))
            ->orderByDesc('ordered_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json($orders);
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orders->create($request->validated(), $request->user());

        return response()->json(['data' => $order], 201);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load([
            'client',
            'prescription.images',
            'creator:id,name',
            'deliveryUser:id,name',
            'statusHistories.changer:id,name',
        ]);

        return response()->json(['data' => $order]);
    }

    public function destroy(Request $request, Order $order): JsonResponse
    {
        if (! in_array($order->status, [Order::STATUS_DELIVERED, Order::STATUS_CANCELLED], true)) {
            return response()->json([
                'message' => __('messages.orders.delete_invalid_status', [
                    'status' => $order->status_label,
                ]),
            ], 422);
        }

        $this->orders->destroy($order, $request->user());

        return response()->json([
            'message' => __('messages.orders.deleted'),
        ]);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $data = $request->validated();

        $order = $this->orders->updateStatus(
            $order,
            $data['status'],
            $request->user(),
            $data['note'] ?? null
        );

        return response()->json([
            'data' => $order,
            'message' => __('messages.orders.status_updated', ['status' => $order->status_label]),
        ]);
    }
}
