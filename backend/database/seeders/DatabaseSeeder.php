<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Setting::setValue(Setting::PENDING_ALERT_DAYS, '5');

        $users = [
            [
                'name' => 'Ana Torres',
                'username' => 'ana',
                'email' => 'ana@optica.local',
            ],
            [
                'name' => 'Luis Ramírez',
                'username' => 'luis',
                'email' => 'luis@optica.local',
            ],
        ];

        foreach ($users as $data) {
            User::firstOrCreate(
                ['username' => $data['username']],
                [
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => Hash::make('Optica2026*'),
                    'is_active' => true,
                ]
            );
        }
    }
}
