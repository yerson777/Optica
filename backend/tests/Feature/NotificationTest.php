<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_overdue_notifications_are_generated_once_for_both_users(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $order = $this->createAncientPendingOrder($user1, 10);

        Sanctum::actingAs($user1);

        $response = $this->getJson('/api/notifications');
        $response->assertOk()->assertJsonPath('unread_count', 2);

        $this->assertSame(4, Notification::query()->where('order_id', $order->id)->count());
        $this->assertSame(2, Notification::query()->where('type', 'overdue')->count());
        $this->assertSame(2, Notification::query()->where('type', 'stale')->count());
        $this->assertSame(2, Notification::query()->where('user_id', $user2->id)->whereNull('read_at')->count());

        $this->getJson('/api/notifications')->assertOk();

        $this->assertSame(4, Notification::query()->where('order_id', $order->id)->count());
    }

    public function test_notifications_can_be_marked_as_read_per_user(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $this->createAncientPendingOrder($user1, 10);

        Sanctum::actingAs($user1);
        $this->getJson('/api/notifications')->assertOk();

        $this->postJson('/api/notifications/read-all')->assertOk();

        $this->assertSame(0, Notification::query()->where('user_id', $user1->id)->whereNull('read_at')->count());
        $this->assertSame(2, Notification::query()->where('user_id', $user2->id)->whereNull('read_at')->count());

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 0);
    }

    public function test_ready_order_waiting_too_long_generates_a_stale_alert(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $order = $this->createAncientPendingOrder($user1, 12);
        $order->update([
            'status' => 'ready',
            'ready_at' => now()->subDays(10),
        ]);

        Sanctum::actingAs($user1);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1);

        $this->assertSame(2, Notification::query()->where('order_id', $order->id)->where('type', 'stale')->count());

        $this->getJson('/api/notifications')->assertOk();

        $this->assertSame(2, Notification::query()->where('order_id', $order->id)->where('type', 'stale')->count());
        $this->assertSame(1, Notification::query()->where('user_id', $user2->id)->whereNull('read_at')->count());
    }

    public function test_pending_alert_days_can_be_configured(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->putJson('/api/settings', ['pending_alert_days' => 3])
            ->assertOk()
            ->assertJsonPath('data.pending_alert_days', 3);

        $this->assertSame('3', Setting::getValue(Setting::PENDING_ALERT_DAYS));

        $this->createAncientPendingOrder($user, 4);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 1);
    }

    private function createAncientPendingOrder(User $user, int $daysAgo): Order
    {
        $client = Client::create([
            'full_name' => 'Cliente Antiguo',
            'phone' => '987654321',
            'created_by' => $user->id,
        ]);

        $prescription = Prescription::create([
            'client_id' => $client->id,
            'registered_at' => now()->subDays($daysAgo)->toDateString(),
            'created_by' => $user->id,
        ]);

        return Order::create([
            'client_id' => $client->id,
            'prescription_id' => $prescription->id,
            'lens_type' => 'Monofocal',
            'status' => 'pending',
            'ordered_at' => now()->subDays($daysAgo)->toDateString(),
            'created_by' => $user->id,
        ]);
    }
}
