<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['username' => 'ana']);
        Sanctum::actingAs($this->admin);
    }

    public function test_authenticated_user_can_create_a_new_user_who_can_login(): void
    {
        $response = $this->postJson('/api/users', [
            'name' => 'María Quispe',
            'username' => 'Maria',
            'password' => 'ClaveSegura2026*',
            'password_confirmation' => 'ClaveSegura2026*',
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'María Quispe')
            ->assertJsonPath('data.username', 'maria')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonMissingPath('data.email');

        $created = User::query()->where('username', 'maria')->firstOrFail();

        $this->assertTrue(Hash::check('ClaveSegura2026*', $created->password));
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.created']);

        $this->app['auth']->forgetGuards();

        $this->postJson('/api/login', [
            'username' => 'maria',
            'password' => 'ClaveSegura2026*',
        ])->assertOk();
    }

    public function test_password_cannot_exceed_the_maximum_length(): void
    {
        $this->postJson('/api/users', [
            'name' => 'María Quispe',
            'username' => 'maria',
            'password' => str_repeat('a', 256),
            'password_confirmation' => str_repeat('a', 256),
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_duplicate_username_is_rejected(): void
    {
        User::factory()->create(['username' => 'maria']);

        $this->postJson('/api/users', [
            'name' => 'Otra María',
            'username' => 'MARIA',
            'password' => 'ClaveSegura2026*',
            'password_confirmation' => 'ClaveSegura2026*',
        ])->assertStatus(422)->assertJsonValidationErrors('username');
    }

    public function test_password_confirmation_is_required(): void
    {
        $this->postJson('/api/users', [
            'name' => 'María Quispe',
            'username' => 'maria',
            'password' => 'ClaveSegura2026*',
            'password_confirmation' => 'OtraClave2026*',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_created_inactive_user_cannot_login(): void
    {
        $this->postJson('/api/users', [
            'name' => 'María Quispe',
            'username' => 'maria',
            'password' => 'ClaveSegura2026*',
            'password_confirmation' => 'ClaveSegura2026*',
            'is_active' => false,
        ])->assertCreated();

        $this->app['auth']->forgetGuards();

        $this->postJson('/api/login', [
            'username' => 'maria',
            'password' => 'ClaveSegura2026*',
        ])->assertStatus(403);
    }

    public function test_users_are_listed_with_pagination(): void
    {
        User::factory()->count(11)->create();

        $response = $this->getJson('/api/users?per_page=5&page=2');

        $response->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('total', 12)
            ->assertJsonPath('last_page', 3)
            ->assertJsonMissingPath('data.0.email');
    }
}
