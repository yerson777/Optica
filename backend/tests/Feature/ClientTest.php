<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    public function test_user_can_register_a_client_with_normalized_phone(): void
    {
        $response = $this->postJson('/api/clients', [
            'full_name' => '  María   López  ',
            'phone' => '987 654 321',
            'observations' => 'Prefiere atención por la tarde.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.full_name', 'María López')
            ->assertJsonPath('data.phone', '987654321');

        $this->assertDatabaseHas('clients', [
            'full_name' => 'María López',
            'phone' => '987654321',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_client_rejects_invalid_phone_and_blank_name(): void
    {
        $this->postJson('/api/clients', [
            'full_name' => '   ',
            'phone' => '12-34',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['full_name', 'phone']);
    }

    public function test_duplicate_client_warning_can_be_confirmed(): void
    {
        Client::create([
            'full_name' => 'María López',
            'phone' => '987654321',
            'created_by' => $this->user->id,
        ]);

        $payload = [
            'full_name' => 'María López',
            'phone' => '987654321',
        ];

        $this->postJson('/api/clients', $payload)
            ->assertStatus(409)
            ->assertJsonCount(1, 'duplicates');

        $this->postJson('/api/clients', $payload + ['confirm_duplicate' => true])
            ->assertCreated();

        $this->assertSame(2, Client::query()->count());
    }

    public function test_clients_can_be_searched_by_name_or_phone(): void
    {
        Client::create(['full_name' => 'María López', 'phone' => '987654321', 'created_by' => $this->user->id]);
        Client::create(['full_name' => 'José Pérez', 'phone' => '912345678', 'created_by' => $this->user->id]);

        $byName = $this->getJson('/api/clients?search=mar');
        $byName->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'María López');

        $byPhone = $this->getJson('/api/clients?search=3456');
        $byPhone->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'José Pérez');
    }

    public function test_client_profile_returns_prescriptions_and_orders(): void
    {
        $client = Client::create([
            'full_name' => 'María López',
            'phone' => '987654321',
            'created_by' => $this->user->id,
        ]);

        $this->getJson('/api/clients/'.$client->id)
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'full_name',
                    'phone',
                    'prescriptions',
                    'orders',
                    'prescriptions_count',
                    'orders_count',
                ],
            ]);
    }

    public function test_client_can_be_updated_without_changing_history(): void
    {
        $client = Client::create([
            'full_name' => 'María López',
            'phone' => '987654321',
            'created_by' => $this->user->id,
        ]);

        $this->putJson('/api/clients/'.$client->id, [
            'full_name' => 'María López de Torres',
            'phone' => '999888777',
            'observations' => 'Nuevo número.',
        ])->assertOk()
            ->assertJsonPath('data.full_name', 'María López de Torres')
            ->assertJsonPath('data.phone', '999888777');
    }

    public function test_client_profile_paginates_prescriptions_and_orders(): void
    {
        $client = Client::create([
            'full_name' => 'María López',
            'phone' => '987654321',
            'created_by' => $this->user->id,
        ]);

        for ($i = 1; $i <= 7; $i++) {
            $prescription = Prescription::create([
                'client_id' => $client->id,
                'registered_at' => now()->subDays($i)->toDateString(),
                'created_by' => $this->user->id,
            ]);

            Order::create([
                'client_id' => $client->id,
                'prescription_id' => $prescription->id,
                'lens_type' => 'Monofocal',
                'status' => 'pending',
                'ordered_at' => now()->subDays($i)->toDateString(),
                'created_by' => $this->user->id,
            ]);
        }

        $this->getJson(
            "/api/clients/{$client->id}?paginated=1&per_page=5&prescriptions_page=2&orders_page=2"
        )
            ->assertOk()
            ->assertJsonCount(2, 'data.prescriptions')
            ->assertJsonCount(2, 'data.orders')
            ->assertJsonPath('data.prescriptions_pagination.current_page', 2)
            ->assertJsonPath('data.prescriptions_pagination.last_page', 2)
            ->assertJsonPath('data.prescriptions_pagination.total', 7)
            ->assertJsonPath('data.orders_pagination.current_page', 2)
            ->assertJsonPath('data.orders_pagination.last_page', 2)
            ->assertJsonPath('data.orders_pagination.total', 7);
    }

    public function test_both_users_see_the_same_clients(): void
    {
        Client::create([
            'full_name' => 'María López',
            'phone' => '987654321',
            'created_by' => $this->user->id,
        ]);

        $other = User::factory()->create();
        Sanctum::actingAs($other);

        $this->getJson('/api/clients')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'María López');
    }
}
