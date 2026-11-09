<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Order;
use App\Models\Prescription;
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

    public function test_prescription_metadata_can_be_updated(): void
    {
        [$prescription] = $this->makePrescriptionWithImage();

        $this->putJson('/api/prescriptions/'.$prescription->id, [
            'registered_at' => now()->subDay()->toDateString(),
            'observations' => 'Observación editada.',
        ])
            ->assertOk()
            ->assertJsonPath('data.observations', 'Observación editada.');

        $this->assertDatabaseHas('prescriptions', [
            'id' => $prescription->id,
            'observations' => 'Observación editada.',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'prescription.updated']);
    }

    public function test_prescription_image_can_be_deleted(): void
    {
        [$prescription, $image] = $this->makePrescriptionWithImage();

        Storage::disk('local')->assertExists($image->file_path);

        $this->deleteJson('/api/prescriptions/'.$prescription->id.'/images/'.$image->id)
            ->assertOk()
            ->assertJsonCount(0, 'data.images');

        $this->assertDatabaseMissing('prescription_images', ['id' => $image->id]);
        Storage::disk('local')->assertMissing($image->file_path);
        $this->assertDatabaseHas('audit_logs', ['action' => 'prescription.image_deleted']);
    }

    public function test_prescription_image_from_another_prescription_cannot_be_deleted(): void
    {
        [$prescriptionA] = $this->makePrescriptionWithImage();
        [, $imageB] = $this->makePrescriptionWithImage();

        $this->deleteJson('/api/prescriptions/'.$prescriptionA->id.'/images/'.$imageB->id)
            ->assertStatus(404);

        $this->assertDatabaseHas('prescription_images', ['id' => $imageB->id]);
    }

    public function test_prescription_image_can_be_replaced(): void
    {
        [$prescription, $image] = $this->makePrescriptionWithImage();
        $oldPath = $image->file_path;

        $file = UploadedFile::fake()->createWithContent(
            'nueva.png',
            base64_decode(self::PNG_BASE64)
        );

        $this->post('/api/prescriptions/'.$prescription->id.'/images/'.$image->id, [
            'image' => $file,
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonCount(1, 'data.images');

        $replacement = PrescriptionImage::query()->firstOrFail();

        $this->assertNotSame($image->id, $replacement->id);
        $this->assertDatabaseMissing('prescription_images', ['id' => $image->id]);
        Storage::disk('local')->assertMissing($oldPath);
        Storage::disk('local')->assertExists($replacement->file_path);
        $this->assertDatabaseHas('audit_logs', ['action' => 'prescription.image_replaced']);
    }

    public function test_prescription_image_replacement_requires_a_file(): void
    {
        [$prescription, $image] = $this->makePrescriptionWithImage();

        $this->postJson('/api/prescriptions/'.$prescription->id.'/images/'.$image->id, [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('image');
    }

    public function test_prescription_can_be_deleted_with_its_images(): void
    {
        [$prescription, $image] = $this->makePrescriptionWithImage();
        $path = $image->file_path;

        Storage::disk('local')->assertExists($path);

        $this->deleteJson('/api/prescriptions/'.$prescription->id)
            ->assertOk();

        $this->assertDatabaseMissing('prescriptions', ['id' => $prescription->id]);
        $this->assertDatabaseMissing('prescription_images', ['id' => $image->id]);
        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseHas('audit_logs', ['action' => 'prescription.deleted']);
    }

    public function test_prescription_with_orders_cannot_be_deleted(): void
    {
        [$prescription] = $this->makePrescriptionWithImage();

        Order::create([
            'client_id' => $this->client->id,
            'prescription_id' => $prescription->id,
            'lens_type' => 'Monofocal',
            'status' => Order::STATUS_PENDING,
            'ordered_at' => now()->toDateString(),
        ]);

        $this->deleteJson('/api/prescriptions/'.$prescription->id)
            ->assertStatus(422);

        $this->assertDatabaseHas('prescriptions', ['id' => $prescription->id]);
    }

    /**
     * @return array{0: Prescription, 1: PrescriptionImage}
     */
    private function makePrescriptionWithImage(): array
    {
        $file = UploadedFile::fake()->createWithContent(
            'receta.png',
            base64_decode(self::PNG_BASE64)
        );

        $response = $this->post('/api/prescriptions', [
            'client_id' => $this->client->id,
            'registered_at' => now()->toDateString(),
            'images' => [$file],
        ], ['Accept' => 'application/json'])->assertCreated();

        $prescription = Prescription::query()->findOrFail($response->json('data.id'));
        $image = PrescriptionImage::query()
            ->where('prescription_id', $prescription->id)
            ->firstOrFail();

        return [$prescription, $image];
    }
}
