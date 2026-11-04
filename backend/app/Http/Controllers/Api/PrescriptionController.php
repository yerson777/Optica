<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StorePrescriptionImageRequest;
use App\Http\Requests\Api\StorePrescriptionRequest;
use App\Models\Prescription;
use App\Services\AuditService;
use App\Services\PrescriptionImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrescriptionController extends Controller
{
    public function __construct(
        private readonly PrescriptionImageService $images,
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:50'],
        ]);

        $perPage = min(50, max(5, (int) $request->query('per_page', 15)));

        $prescriptions = Prescription::query()
            ->with([
                'client:id,full_name,phone',
                'creator:id,name',
                'images',
            ])
            ->withCount('orders')
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->integer('client_id')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = $request->query('search');
                $query->whereHas('client', fn ($clientQuery) => $clientQuery->search($term));
            })
            ->registeredBetween($request->query('from'), $request->query('to'))
            ->orderByDesc('registered_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json($prescriptions);
    }

    public function store(StorePrescriptionRequest $request): JsonResponse
    {
        $data = $request->validated();

        $prescription = DB::transaction(function () use ($request, $data) {
            $prescription = Prescription::create([
                'client_id' => $data['client_id'],
                'observations' => $data['observations'] ?? null,
                'registered_at' => $data['registered_at'],
                'created_by' => $request->user()->id,
            ]);

            $this->images->storeMany(
                $prescription,
                $request->file('images', []),
                $request->user()->id
            );

            $this->audit->log(
                'prescription.created',
                "Registró una receta para el cliente #{$prescription->client_id}",
                $prescription,
                ['images' => count($request->file('images', []))]
            );

            return $prescription;
        });

        $prescription->load(['client:id,full_name,phone', 'images', 'creator:id,name']);

        return response()->json(['data' => $prescription], 201);
    }

    public function show(Prescription $prescription): JsonResponse
    {
        $prescription->load([
            'client:id,full_name,phone',
            'creator:id,name',
            'images',
            'orders' => fn ($q) => $q->with(['creator:id,name', 'deliveryUser:id,name'])->orderByDesc('ordered_at'),
        ]);

        return response()->json(['data' => $prescription]);
    }

    public function addImages(StorePrescriptionImageRequest $request, Prescription $prescription): JsonResponse
    {
        DB::transaction(function () use ($request, $prescription) {
            $this->images->storeMany(
                $prescription,
                $request->file('images', []),
                $request->user()->id
            );

            $this->audit->log(
                'prescription.images_added',
                "Agregó fotografías a la receta #{$prescription->id}",
                $prescription,
                ['images' => count($request->file('images', []))]
            );
        });

        return response()->json([
            'data' => $prescription->fresh()->load('images'),
        ]);
    }
}
