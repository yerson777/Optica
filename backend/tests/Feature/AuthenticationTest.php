<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_ping_endpoint_is_public(): void
    {
        $this->getJson('/api/ping')
            ->assertOk()
            ->assertJsonPath('status', 'ok');
    }

    public function test_user_can_login_and_access_protected_endpoints(): void
    {
        $user = User::factory()->create([
            'username' => 'ana',
            'password' => 'Secret123*',
        ]);

        $response = $this->postJson('/api/login', [
            'username' => 'ana',
            'password' => 'Secret123*',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'username']]]);

        $token = $response->json('data.token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/dashboard')
            ->assertOk();
    }

    public function test_login_fails_with_wrong_credentials(): void
    {
        User::factory()->create(['username' => 'ana', 'password' => 'Secret123*']);

        $this->postJson('/api/login', [
            'username' => 'ana',
            'password' => 'incorrecta',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('username');
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::factory()->inactive()->create([
            'username' => 'ana',
            'password' => 'Secret123*',
        ]);

        $this->postJson('/api/login', [
            'username' => 'ana',
            'password' => 'Secret123*',
        ])->assertStatus(403);
    }

    public function test_protected_endpoints_require_authentication(): void
    {
        $this->getJson('/api/clients')->assertStatus(401);
        $this->getJson('/api/dashboard')->assertStatus(401);
    }

    public function test_user_can_logout_and_token_is_revoked(): void
    {
        User::factory()->create([
            'username' => 'ana',
            'password' => 'Secret123*',
        ]);

        $token = $this->postJson('/api/login', [
            'username' => 'ana',
            'password' => 'Secret123*',
        ])->json('data.token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/dashboard')
            ->assertStatus(401);
    }

    public function test_user_can_change_password(): void
    {
        $user = User::factory()->create([
            'username' => 'ana',
            'password' => 'Secret123*',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/change-password', [
                'current_password' => 'Secret123*',
                'password' => 'NuevaClave2026*',
                'password_confirmation' => 'NuevaClave2026*',
            ])
            ->assertOk();

        $this->postJson('/api/login', [
            'username' => 'ana',
            'password' => 'NuevaClave2026*',
        ])->assertOk();
    }
}
