<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ChangePasswordRequest;
use App\Http\Requests\Api\LoginRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('username', $request->string('username'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'username' => __('messages.auth.invalid_credentials'),
            ]);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => __('messages.auth.inactive'),
            ], 403);
        }

        $token = $user->createToken('optica-web')->plainTextToken;

        $this->audit->log(
            'auth.login',
            "Inició sesión {$user->name}",
            $user,
            [],
            $user->id
        );

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => $user,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->audit->log('auth.logout', "Cerró sesión {$user->name}", $user);

        $token = $user->currentAccessToken();

        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json(['message' => __('messages.auth.logged_out')]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->string('current_password'), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => __('messages.auth.current_password_invalid'),
            ]);
        }

        $user->update(['password' => $request->string('password')->toString()]);

        $currentToken = $user->currentAccessToken();

        if ($currentToken && method_exists($currentToken, 'getKey')) {
            $user->tokens()->where('id', '!=', $currentToken->getKey())->delete();
        }

        $this->audit->log('auth.password_changed', 'Cambió su contraseña', $user);

        return response()->json(['message' => __('messages.auth.password_changed')]);
    }
}
