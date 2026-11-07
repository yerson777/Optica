<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreClientRequest;
use App\Http\Requests\Api\UpdateClientRequest;
use App\Models\Client;
use App\Services\AuditService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class ClientController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $search = trim((string) $request->query('search', ''));
        $perPage = min(50, max(5, (int) $request->query('per_page', 12)));

        $clients = Client::query()
            ->search($search)
            ->when($request->filled('from'), fn ($q) => $q->whereDate('created_at', '>=', $request->query('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('created_at', '<=', $request->query('to')))
            ->withCount(['orders', 'prescriptions'])
            ->with('latestOrder')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json($clients);
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        $data = $request->validated();
        $duplicates = $this->findDuplicates($data['full_name'], $data['phone']);

        if ($duplicates->isNotEmpty() && ! $request->boolean('confirm_duplicate')) {
            return response()->json([
                'message' => __('messages.clients.duplicates'),
                'duplicates' => $duplicates,
            ], 409);
        }

        $client = Client::create([
            'full_name' => $data['full_name'],
            'phone' => $data['phone'],
            'observations' => $data['observations'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->log('client.created', "Registró al cliente {$client->full_name}", $client, [
            'phone' => $client->phone,
        ]);

        return response()->json(['data' => $client], 201);
    }

    public function show(Request $request, Client $client): JsonResponse
    {
        $request->validate([
            'paginated' => ['nullable', 'boolean'],
            'prescriptions_page' => ['nullable', 'integer', 'min:1'],
            'orders_page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:3', 'max:20'],
        ]);

        $client->load('creator:id,name')->loadCount(['orders', 'prescriptions']);

        if (! $request->boolean('paginated')) {
            $client->load([
                'prescriptions' => fn ($q) => $q->with([
                    'images',
                    'creator:id,name',
                    'orders' => fn ($orders) => $orders->orderByDesc('ordered_at')->orderByDesc('id'),
                ])->orderByDesc('registered_at')->orderByDesc('id'),
                'orders' => fn ($q) => $q->with([
                    'creator:id,name',
                    'deliveryUser:id,name',
                    'prescription:id,registered_at,observations',
                    'statusHistories.changer:id,name',
                ])->orderByDesc('ordered_at')->orderByDesc('id'),
            ]);

            return response()->json(['data' => $client]);
        }

        $perPage = min(20, max(3, (int) $request->query('per_page', 6)));

        $prescriptions = $client->prescriptions()
            ->with([
                'images',
                'creator:id,name',
                'orders' => fn ($orders) => $orders->orderByDesc('ordered_at')->orderByDesc('id'),
            ])
            ->orderByDesc('registered_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'prescriptions_page');

        $orders = $client->orders()
            ->with([
                'creator:id,name',
                'deliveryUser:id,name',
                'prescription:id,registered_at,observations',
                'statusHistories.changer:id,name',
            ])
            ->orderByDesc('ordered_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'orders_page');

        return response()->json([
            'data' => array_merge($client->toArray(), [
                'prescriptions' => $prescriptions->items(),
                'prescriptions_pagination' => $this->paginationMeta($prescriptions),
                'orders' => $orders->items(),
                'orders_pagination' => $this->paginationMeta($orders),
            ]),
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client): JsonResponse
    {
        $data = $request->validated();
        $client->update($data);

        $this->audit->log('client.updated', "Actualizó al cliente {$client->full_name}", $client, [
            'phone' => $client->phone,
        ]);

        return response()->json(['data' => $client->fresh()]);
    }

    public function duplicates(Request $request): JsonResponse
    {
        $name = trim((string) $request->query('name', ''));
        $phone = preg_replace('/[^\d+]/', '', (string) $request->query('phone', ''));

        if ($name === '' && $phone === '') {
            return response()->json(['data' => []]);
        }

        return response()->json(['data' => $this->findDuplicates($name, $phone)]);
    }

    private function findDuplicates(string $name, string $phone): Collection
    {
        return Client::query()
            ->where(function ($query) use ($name, $phone) {
                if ($name !== '') {
                    $query->whereRaw('LOWER(full_name) = ?', [mb_strtolower($name)]);
                }

                if ($phone !== '') {
                    $name !== ''
                        ? $query->orWhere('phone', $phone)
                        : $query->where('phone', $phone);
                }
            })
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'full_name', 'phone', 'created_at']);
    }

    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }
}
