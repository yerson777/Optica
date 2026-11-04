<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrescriptionImage;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PrescriptionImageController extends Controller
{
    public function file(PrescriptionImage $prescriptionImage): Response|BinaryFileResponse
    {
        $disk = Storage::disk('local');

        abort_unless($disk->exists($prescriptionImage->file_path), 404, 'La fotografía no está disponible.');

        return response()->file($disk->path($prescriptionImage->file_path), [
            'Content-Type' => $prescriptionImage->mime_type,
            'Content-Disposition' => 'inline; filename="'.$this->safeHeaderName($prescriptionImage->original_name).'"',
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function download(PrescriptionImage $prescriptionImage): BinaryFileResponse
    {
        $disk = Storage::disk('local');

        abort_unless($disk->exists($prescriptionImage->file_path), 404, 'La fotografía no está disponible.');

        return response()->download(
            $disk->path($prescriptionImage->file_path),
            $this->safeHeaderName($prescriptionImage->original_name),
            [
                'Content-Type' => $prescriptionImage->mime_type,
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }

    private function safeHeaderName(string $name): string
    {
        $clean = preg_replace('/[^A-Za-z0-9._ -]+/', '_', $name);

        return $clean !== '' ? $clean : 'receta.jpg';
    }
}
