<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriptionImage extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'prescription_id',
        'file_path',
        'original_name',
        'mime_type',
        'file_size',
        'created_by',
        'created_at',
    ];

    protected $hidden = [
        'file_path',
    ];

    protected $appends = [
        'url',
        'download_url',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getUrlAttribute(): string
    {
        return url('/api/prescription-images/'.$this->id.'/file');
    }

    public function getDownloadUrlAttribute(): string
    {
        return url('/api/prescription-images/'.$this->id.'/download');
    }
}
