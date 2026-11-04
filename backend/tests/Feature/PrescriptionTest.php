<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\PrescriptionImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrescriptionTest extends TestCase
{
    use RefreshDatabase;

    private const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    private User $user;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->user = User::factory()->create();
        $this->client = Client::create([
            'full_name' => 'María López',
            'phone' => '987654321',
            'created_by' => $this->user->id,
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_prescription_can_be_created_with_photo_stored_privately(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'receta.png',
            base64_decode(self::PNG_BASE64)
        );

        $response = $this->post('/api/prescriptions', [
            'client_id' => $this->client->id,
            'observations' => 'Receta del control anual.',
            'registered_at' => now()->toDateString(),
            'images' => [$file],
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.client_id', $this->client->id)
            ->assertJsonCount(1, 'data.images');

        $image = PrescriptionImage::query()->firstOrFail();

        Storage::disk('local')->assertExists($image->file_path);
        $this->assertStringStartsWith('prescriptions/'.$response->json('data.id').'/', $image->file_path);
        $this->assertSame('image/png', $image->mime_type);
        $this->assertDatabaseHas('audit_logs', ['action' => 'prescription.created']);
    }

    public function test_prescription_rejects_a_future_date(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'receta.png',
            base64_decode(self::PNG_BASE64)
        );

        $this->post('/api/prescriptions', [
            'client_id' => $this->client->id,
            'registered_at' => now()->addDay()->toDateString(),
            'images' => [$file],
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('registered_at');
    }

    public function test_prescription_requires_at_least_one_photo(): void
    {
        $this->postJson('/api/prescriptions', [
            'client_id' => $this->client->id,
            'registered_at' => now()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('images');
    }

    public function test_prescription_rejects_invalid_file_type(): void
    {
        $file = UploadedFile::fake()->createWithContent('receta.txt', 'no es una imagen');

        $this->post('/api/prescriptions', [
            'client_id' => $this->client->id,
            'registered_at' => now()->toDateString(),
            'images' => [$file],
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('images.0');
    }

    public function test_prescription_photo_is_protected_and_can_be_downloaded(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'receta.png',
            base64_decode(self::PNG_BASE64)
        );

        $this->post('/api/prescriptions', [
            'client_id' => $this->client->id,
            'registered_at' => now()->toDateString(),
            'images' => [$file],
        ], ['Accept' => 'application/json'])->assertCreated();

        $image = PrescriptionImage::query()->firstOrFail();

        $this->get('/api/prescription-images/'.$image->id.'/file')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');

        $this->get('/api/prescription-images/'.$image->id.'/download')
            ->assertOk();
    }

    public function test_photo_cannot_be_accessed_without_authentication(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'receta.png',
            base64_decode(self::PNG_BASE64)
        );

        $this->post('/api/prescriptions', [
            'client_id' => $this->client->id,
            'registered_at' => now()->toDateString(),
            'images' => [$file],
        ], ['Accept' => 'application/json'])->assertCreated();

        $image = PrescriptionImage::query()->firstOrFail();

        $this->app['auth']->forgetGuards();

        $this->get('/api/prescription-images/'.$image->id.'/file')
            ->assertStatus(401);
    }
}
