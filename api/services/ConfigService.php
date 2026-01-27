<?php
/**
 * ASDF Games - Configuration Service
 *
 * Provides environment-aware configuration.
 * Mirrors the JavaScript CONFIG object for API consistency.
 */

declare(strict_types=1);

namespace ASDF\Api\Services;

class ConfigService
{
    private array $config;

    public function __construct()
    {
        $this->config = $this->loadConfig();
    }

    /**
     * Load configuration based on environment
     */
    private function loadConfig(): array
    {
        $env = $this->getEnvironment();

        $defaults = [
            'ENV' => $env,
            'DEV_MODE' => $env === 'development',

            // Token configuration
            'ASDF_TOKEN_MINT' => 'ASdfasdFa6u9KrRuVMPQKWY4DNKL24ShUggDhFGvpump',
            'TOKEN_DECIMALS' => 6,
            'MIN_HOLDER_BALANCE' => 10_000_000,

            // Wallets
            'TREASURY_WALLET' => 'GXyzQ3V8jP2nMx7RdKfLmNs9TUvWkH6pY4cABrDqE5gh',
            'ESCROW_WALLET' => 'HKabJ4Z9pL5nQy2TdMrXW8vYuNfH3sEjG6mC7BxRkU9w',

            // API endpoints
            'API_BASE' => $this->getApiBase($env),
            'SOLANA_RPC' => 'https://api.mainnet-beta.solana.com',

            // Game rotation
            'ROTATION_EPOCH' => '2025-01-20T00:00:00Z',
            'CYCLE_WEEKS' => 9,
        ];

        // Override from environment variables
        return array_merge($defaults, $this->loadEnvOverrides());
    }

    /**
     * Detect current environment
     */
    private function getEnvironment(): string
    {
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

        if (str_contains($host, 'localhost') || str_contains($host, '127.0.0.1')) {
            return 'development';
        }
        if (str_contains($host, 'test.') || str_contains($host, 'staging.')) {
            return 'staging';
        }
        return 'production';
    }

    /**
     * Get API base URL for environment
     */
    private function getApiBase(string $env): string
    {
        return match ($env) {
            'development' => 'http://localhost:3000/api',
            'staging' => 'https://test.alonisthe.dev/api',
            default => 'https://asdf-api.onrender.com/api',
        };
    }

    /**
     * Load overrides from environment variables
     */
    private function loadEnvOverrides(): array
    {
        $overrides = [];

        if ($apiBase = getenv('ASDF_API_BASE')) {
            $overrides['API_BASE'] = $apiBase;
        }
        if ($rpc = getenv('SOLANA_RPC')) {
            $overrides['SOLANA_RPC'] = $rpc;
        }

        return $overrides;
    }

    /**
     * Get a config value
     */
    public function get(string $key, mixed $default = null): mixed
    {
        return $this->config[$key] ?? $default;
    }

    /**
     * Get all config as array
     */
    public function all(): array
    {
        return $this->config;
    }

    /**
     * Check if in dev mode
     */
    public function isDev(): bool
    {
        return $this->config['DEV_MODE'] === true;
    }

    /**
     * Get as JSON for JavaScript hydration
     */
    public function toJson(): string
    {
        // Filter sensitive values
        $safe = array_filter($this->config, fn($key) =>
            !str_contains($key, 'SECRET') && !str_contains($key, 'PRIVATE'),
            ARRAY_FILTER_USE_KEY
        );
        return json_encode($safe, JSON_THROW_ON_ERROR);
    }
}
