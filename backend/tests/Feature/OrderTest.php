<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $otherUser;

    private Client $client;

    private Prescription $prescription;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['name' => 'Ana']);
        $this->otherUser = User::factory()->create(['name' => 'Luis']);

        $this->client = Client::create([
            'full_name' => 'María López',
            'phone' => '987654321',
            'created_by' => $this->user->id,
        ]);

        $this->prescription = Prescription::create([
            'client_id' => $this->client->id,
            'registered_at' => now()->toDateString(),
            'created_by' => $this->user->id,
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_order_can_be_created_and_balance_is_calculated(): void
    {
        $response = $this->postJson('/api/orders', [
            'client_id' => $this->client->id,
            'prescription_id' => $this->prescription->id,
            'lens_type' => 'Progresivo',
            'observations' => 'Antirreflejo.',
            'price' => 450,
            'advance' => 150,
            'ordered_at' => now()->toDateString(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.balance', 300)
            ->assertJsonPath('data.client.full_name', 'María López');

        $this->assertDatabaseHas('order_status_histories', [
            'from_status' => null,
            'to_status' => 'pending',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'order.created']);
    }

    public function test_order_rejects_prescription_from_another_client(): void
    {
        $otherClient = Client::create([
            'full_name' => 'Otro Cliente',
            'phone' => '999999999',
            'created_by' => $this->user->id,
        ]);

        $this->postJson('/api/orders', [
            'client_id' => $otherClient->id,
            'prescription_id' => $this->prescription->id,
            'lens_type' => 'Monofocal',
            'ordered_at' => now()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('prescription_id');
    }

    public function test_order_rejects_a_future_date(): void
    {
        $this->postJson('/api/orders', [
            'client_id' => $this->client->id,
            'prescription_id' => $this->prescription->id,
            'lens_type' => 'Monofocal',
            'ordered_at' => now()->addDay()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('ordered_at');
    }

    public function test_order_advance_cannot_exceed_price(): void
    {
        $this->postJson('/api/orders', [
            'client_id' => $this->client->id,
            'prescription_id' => $this->prescription->id,
            'lens_type' => 'Monofocal',
            'price' => 100,
            'advance' => 150,
            'ordered_at' => now()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('advance');
    }

    public function test_order_goes_from_pending_to_ready_to_delivered_with_history(): void
    {
        $order = $this->createOrder();

        $this->patchJson('/api/orders/'.$order->id.'/status', ['status' => 'ready'])
            ->assertOk()
            ->assertJsonPath('data.status', 'ready');

        $this->assertNotNull($order->fresh()->ready_at);
        $this->assertSame(2, Notification::query()->where('order_id', $order->id)->count());
        $this->assertSame(2, Notification::query()->where('order_id', $order->id)->where('type', 'ready')->count());

        $this->patchJson('/api/orders/'.$order->id.'/status', ['status' => 'delivered'])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered')
            ->assertJsonPath('data.delivered_by', $this->user->id);

        $fresh = $order->fresh();

        $this->assertNotNull($fresh->delivered_at);
        $this->assertSame($this->user->id, $fresh->delivered_by);
        $this->assertSame(3, $fresh->statusHistories()->count());
        $this->assertSame(0, Notification::query()->where('order_id', $order->id)->whereNull('read_at')->count());
    }

    public function test_invalid_status_transition_is_rejected(): void
    {
        $order = $this->createOrder();

        $this->patchJson('/api/orders/'.$order->id.'/status', ['status' => 'delivered'])
            ->assertStatus(422);

        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_ready_order_notifications_are_not_duplicated(): void
    {
        $order = $this->createOrder();

        $this->patchJson('/api/orders/'.$order->id.'/status', ['status' => 'ready'])->assertOk();
        $this->patchJson('/api/orders/'.$order->id.'/status', ['status' => 'pending'])->assertOk();
        $this->patchJson('/api/orders/'.$order->id.'/status', ['status' => 'ready'])->assertOk();

        $this->assertSame(2, Notification::query()->where('order_id', $order->id)->count());
    }

    public function test_both_users_can_see_the_same_orders(): void
    {
        $this->createOrder();

        Sanctum::actingAs($this->otherUser);

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.client.full_name', 'María López');
    }

    public function test_dashboard_shows_real_statistics(): void
    {
        $this->createOrder();
        $ready = $this->createOrder();
        $ready->update(['status' => 'ready', 'ready_at' => now()]);
        $delivered = $this->createOrder();
        $delivered->update([
            'status' => 'delivered',
            'ready_at' => now(),
            'delivered_at' => now(),
            'delivered_by' => $this->user->id,
        ]);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.stats.total_clients', 1)
            ->assertJsonPath('data.stats.pending_orders', 1)
            ->assertJsonPath('data.stats.ready_orders', 1)
            ->assertJsonPath('data.stats.delivered_this_month', 1);
    }

    private function createOrder(): Order
    {
        return app(OrderService::class)->create([
            'client_id' => $this->client->id,
            'prescription_id' => $this->prescription->id,
            'lens_type' => 'Monofocal',
            'ordered_at' => now()->toDateString(),
        ], $this->user);
    }
}
