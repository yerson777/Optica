<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['prescription_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('prescription_id')->nullable()->change();
            $table->foreign('prescription_id')->references('id')->on('prescriptions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['prescription_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('prescription_id')->nullable(false)->change();
            $table->foreign('prescription_id')->references('id')->on('prescriptions')->restrictOnDelete();
        });
    }
};
