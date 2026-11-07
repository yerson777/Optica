<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreUserRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min(50, max(5, (int) $request->query('per_page', 10)));

        $users = User::query()
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
            ]);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['username'].'@optica.local',
            'password' => $data['password'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        $this->audit->log(
            'user.created',
            "Creó al usuario {$user->username}",
            $user,
            ['name' => $user->name, 'is_active' => $user->is_active]
        );

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
            ],
            'message' => __('messages.users.created'),
        ], 201);
    }
}
