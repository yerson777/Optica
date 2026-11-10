<?php

namespace App\Services;

use App\Models\Prescription;
use App\Models\PrescriptionImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class PrescriptionImageService
{
    public const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    /**
     * @param  array<int, UploadedFile>  $files
     * @return array<int, PrescriptionImage>
     */
    public function storeMany(Prescription $prescription, array $files, ?int $userId): array
    {
        $stored = [];

        foreach ($files as $file) {
            $stored[] = $this->storeOne($prescription, $file, $userId);
        }

        return $stored;
    }

    public function storeOne(Prescription $prescription, UploadedFile $file, ?int $userId): PrescriptionImage
    {
        $mime = $file->getMimeType();

        if (! in_array($mime, self::ALLOWED_MIME_TYPES, true)) {
            throw new RuntimeException(__('messages.prescriptions.image_format_not_allowed'));
        }

        $extension = match ($mime) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };

        $directory = 'prescriptions/'.$prescription->id;
        $filename = Str::uuid()->toString().'.'.$extension;

        $path = $file->storeAs($directory, $filename, 'local');

        if ($path === false) {
            throw new RuntimeException(__('messages.prescriptions.image_save_failed'));
        }

        return PrescriptionImage::create([
            'prescription_id' => $prescription->id,
            'file_path' => $path,
            'original_name' => $this->safeOriginalName($file->getClientOriginalName(), $extension),
            'mime_type' => $mime,
            'file_size' => Storage::disk('local')->size($path),
            'created_by' => $userId,
            'created_at' => now(),
        ]);
    }

    public function replaceOne(
        Prescription $prescription,
        PrescriptionImage $image,
        UploadedFile $file,
        ?int $userId
    ): PrescriptionImage {
        $replacement = $this->storeOne($prescription, $file, $userId);
        $this->deleteOne($image);

        return $replacement;
    }

    public function deleteOne(PrescriptionImage $image): void
    {
        $path = $image->file_path;

        if (is_string($path) && $path !== '') {
            try {
                Storage::disk('local')->delete($path);
            } catch (\Throwable $e) {
                Log::warning('No se pudo eliminar el archivo de la receta', [
                    'image_id' => $image->id,
                    'path' => $path,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $image->delete();
    }

    private function safeOriginalName(string $name, string $extension): string
    {
        $base = pathinfo($name, PATHINFO_FILENAME);
        $base = Str::limit(preg_replace('/[^\pL\pN\-_ ]+/u', '', $base) ?: 'receta', 180, '');

        return trim($base).'.'.$extension;
    }
}
