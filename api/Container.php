<?php
/**
 * ASDF Games - PSR-11 Compatible Service Container
 *
 * Lightweight dependency injection container following PSR-11 interface.
 * Supports lazy instantiation and circular dependency detection.
 *
 * @see https://www.php-fig.org/psr/psr-11/
 */

declare(strict_types=1);

namespace ASDF\Api;

use Exception;

/**
 * Exception thrown when a service is not found
 */
class NotFoundException extends Exception {}

/**
 * Exception thrown when there's a container error
 */
class ContainerException extends Exception {}

/**
 * PSR-11 Compatible Service Container
 */
class Container
{
    /** @var array<string, callable> Service factories */
    private array $factories = [];

    /** @var array<string, mixed> Resolved instances */
    private array $instances = [];

    /** @var array<string, bool> Currently resolving (circular detection) */
    private array $resolving = [];

    /** @var bool Container locked */
    private bool $locked = false;

    /**
     * Register a service factory
     *
     * @param string $id Service identifier
     * @param callable $factory Factory function (receives container)
     * @return self
     * @throws ContainerException If container is locked
     */
    public function set(string $id, callable $factory): self
    {
        if ($this->locked) {
            throw new ContainerException("Container is locked, cannot register '$id'");
        }

        $this->factories[$id] = $factory;
        return $this;
    }

    /**
     * Register a constant value
     *
     * @param string $id Service identifier
     * @param mixed $value Constant value
     * @return self
     */
    public function constant(string $id, mixed $value): self
    {
        $this->set($id, fn() => $value);
        $this->instances[$id] = $value;
        return $this;
    }

    /**
     * Get a service instance (PSR-11)
     *
     * @param string $id Service identifier
     * @return mixed Service instance
     * @throws NotFoundException If service not found
     * @throws ContainerException If circular dependency detected
     */
    public function get(string $id): mixed
    {
        // Return cached instance
        if (isset($this->instances[$id])) {
            return $this->instances[$id];
        }

        // Check if registered
        if (!$this->has($id)) {
            throw new NotFoundException("Service '$id' not found");
        }

        // Circular dependency detection
        if (isset($this->resolving[$id])) {
            $chain = implode(' -> ', array_keys($this->resolving));
            throw new ContainerException("Circular dependency: $chain -> $id");
        }

        // Resolve
        $this->resolving[$id] = true;
        try {
            $this->instances[$id] = ($this->factories[$id])($this);
            return $this->instances[$id];
        } finally {
            unset($this->resolving[$id]);
        }
    }

    /**
     * Check if service is registered (PSR-11)
     *
     * @param string $id Service identifier
     * @return bool
     */
    public function has(string $id): bool
    {
        return isset($this->factories[$id]);
    }

    /**
     * Lock the container
     *
     * @return self
     */
    public function lock(): self
    {
        $this->locked = true;
        return $this;
    }

    /**
     * Get all registered service IDs
     *
     * @return string[]
     */
    public function keys(): array
    {
        return array_keys($this->factories);
    }

    /**
     * Get container stats
     *
     * @return array{registered: int, resolved: int, locked: bool}
     */
    public function stats(): array
    {
        return [
            'registered' => count($this->factories),
            'resolved' => count($this->instances),
            'locked' => $this->locked,
        ];
    }
}
