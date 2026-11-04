<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_READY = 'ready';

    public const STATUS_DELIVERED = 'delivered';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_READY,
        self::STATUS_DELIVERED,
        self::STATUS_CANCELLED,
    ];

    public const STATUS_LABELS = [
        self::STATUS_PENDING => 'Pendiente',
        self::STATUS_READY => 'Listo para entregar',
        self::STATUS_DELIVERED => 'Entregado',
        self::STATUS_CANCELLED => 'Cancelado',
    ];

    protected $fillable = [
        'client_id',
        'prescription_id',
        'lens_type',
        'observations',
        'price',
        'advance',
        'status',
        'ordered_at',
        'ready_at',
        'delivered_at',
        'created_by',
        'delivered_by',
    ];

    protected $appends = [
        'balance',
        'days_pending',
        'status_label',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'advance' => 'decimal:2',
            'ordered_at' => 'date:Y-m-d',
            'ready_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deliveryUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivered_by');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('created_at');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function getBalanceAttribute(): ?float
    {
        if ($this->price === null) {
            return null;
        }

        $advance = $this->advance === null ? 0 : (float) $this->advance;

        return round((float) $this->price - $advance, 2);
    }

    public function getDaysPendingAttribute(): int
    {
        if (! $this->ordered_at) {
            return 0;
        }

        $end = match ($this->status) {
            self::STATUS_DELIVERED => $this->delivered_at ?? now(),
            self::STATUS_READY => $this->ready_at ?? now(),
            default => now(),
        };

        return (int) abs($this->ordered_at->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()));
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);

        if ($term === '') {
            return $query;
        }

        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';

        return $query->whereHas('client', function (Builder $q) use ($like) {
            $q->where('full_name', 'like', $like)
                ->orWhere('phone', 'like', $like);
        });
    }

    public function scopeFilterStatus(Builder $query, ?string $status): Builder
    {
        return $query->when(
            $status && in_array($status, self::STATUSES, true),
            fn (Builder $q) => $q->where('status', $status)
        );
    }

    public function scopeOrderedBetween(Builder $query, ?string $from, ?string $to): Builder
    {
        return $query
            ->when($from, fn (Builder $q) => $q->whereDate('ordered_at', '>=', $from))
            ->when($to, fn (Builder $q) => $q->whereDate('ordered_at', '<=', $to));
    }
}
