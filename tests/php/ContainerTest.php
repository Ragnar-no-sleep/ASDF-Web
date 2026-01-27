<?php
/**
 * ASDF API - Container Unit Tests
 *
 * Tests for the PSR-11 compatible service container.
 * Run with: php tests/php/ContainerTest.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../../api/Container.php';

use ASDF\Api\Container;
use ASDF\Api\NotFoundException;
use ASDF\Api\ContainerException;

class ContainerTest
{
    private int $passed = 0;
    private int $failed = 0;
    private array $errors = [];

    public function run(): void
    {
        echo "=== Container Unit Tests ===\n\n";

        $this->testSetAndGet();
        $this->testHas();
        $this->testConstant();
        $this->testLazyInstantiation();
        $this->testDependencyInjection();
        $this->testCircularDependencyDetection();
        $this->testNotFoundThrows();
        $this->testLock();
        $this->testKeys();
        $this->testStats();

        $this->printSummary();
    }

    private function assert(bool $condition, string $message): void
    {
        if ($condition) {
            echo "  ✓ {$message}\n";
            $this->passed++;
        } else {
            echo "  ✗ {$message}\n";
            $this->failed++;
            $this->errors[] = $message;
        }
    }

    private function testSetAndGet(): void
    {
        echo "1. set() and get()\n";

        $container = new Container();
        $container->set('greeting', fn() => 'Hello, World!');

        $this->assert(
            $container->get('greeting') === 'Hello, World!',
            'Should return value from factory'
        );
    }

    private function testHas(): void
    {
        echo "\n2. has()\n";

        $container = new Container();
        $container->set('exists', fn() => true);

        $this->assert(
            $container->has('exists') === true,
            'Should return true for registered service'
        );

        $this->assert(
            $container->has('notexists') === false,
            'Should return false for unregistered service'
        );
    }

    private function testConstant(): void
    {
        echo "\n3. constant()\n";

        $container = new Container();
        $container->constant('pi', 3.14159);

        $this->assert(
            $container->get('pi') === 3.14159,
            'Should return constant value'
        );

        $this->assert(
            $container->has('pi') === true,
            'Constant should be registered'
        );
    }

    private function testLazyInstantiation(): void
    {
        echo "\n4. Lazy instantiation\n";

        $container = new Container();
        $callCount = 0;

        $container->set('counter', function() use (&$callCount) {
            $callCount++;
            return $callCount;
        });

        $this->assert(
            $callCount === 0,
            'Factory should not be called on registration'
        );

        $first = $container->get('counter');
        $this->assert(
            $callCount === 1,
            'Factory should be called on first get'
        );

        $second = $container->get('counter');
        $this->assert(
            $callCount === 1,
            'Factory should not be called on subsequent gets'
        );

        $this->assert(
            $first === $second,
            'Should return same instance (singleton)'
        );
    }

    private function testDependencyInjection(): void
    {
        echo "\n5. Dependency injection\n";

        $container = new Container();

        $container->set('config', fn() => ['db' => 'mysql://localhost']);

        $container->set('database', function(Container $c) {
            $config = $c->get('config');
            return 'Connected to: ' . $config['db'];
        });

        $result = $container->get('database');

        $this->assert(
            $result === 'Connected to: mysql://localhost',
            'Should inject dependencies via container'
        );
    }

    private function testCircularDependencyDetection(): void
    {
        echo "\n6. Circular dependency detection\n";

        $container = new Container();

        $container->set('a', fn(Container $c) => $c->get('b'));
        $container->set('b', fn(Container $c) => $c->get('a'));

        $caught = false;
        try {
            $container->get('a');
        } catch (ContainerException $e) {
            $caught = str_contains($e->getMessage(), 'Circular');
        }

        $this->assert(
            $caught === true,
            'Should throw ContainerException on circular dependency'
        );
    }

    private function testNotFoundThrows(): void
    {
        echo "\n7. NotFoundException\n";

        $container = new Container();

        $caught = false;
        try {
            $container->get('nonexistent');
        } catch (NotFoundException $e) {
            $caught = true;
        }

        $this->assert(
            $caught === true,
            'Should throw NotFoundException for missing service'
        );
    }

    private function testLock(): void
    {
        echo "\n8. lock()\n";

        $container = new Container();
        $container->set('before', fn() => 'registered before lock');
        $container->lock();

        $this->assert(
            $container->get('before') === 'registered before lock',
            'Should still resolve services after lock'
        );

        $caught = false;
        try {
            $container->set('after', fn() => 'should fail');
        } catch (ContainerException $e) {
            $caught = str_contains($e->getMessage(), 'locked');
        }

        $this->assert(
            $caught === true,
            'Should throw on registration after lock'
        );
    }

    private function testKeys(): void
    {
        echo "\n9. keys()\n";

        $container = new Container();
        $container->set('a', fn() => 1);
        $container->set('b', fn() => 2);
        $container->set('c', fn() => 3);

        $keys = $container->keys();

        $this->assert(
            count($keys) === 3,
            'Should return 3 keys'
        );

        $this->assert(
            in_array('a', $keys) && in_array('b', $keys) && in_array('c', $keys),
            'Should contain all registered service IDs'
        );
    }

    private function testStats(): void
    {
        echo "\n10. stats()\n";

        $container = new Container();
        $container->set('x', fn() => 'x');
        $container->set('y', fn() => 'y');
        $container->get('x'); // Resolve one

        $stats = $container->stats();

        $this->assert(
            $stats['registered'] === 2,
            'Should report 2 registered services'
        );

        $this->assert(
            $stats['resolved'] === 1,
            'Should report 1 resolved service'
        );

        $this->assert(
            $stats['locked'] === false,
            'Should report unlocked state'
        );
    }

    private function printSummary(): void
    {
        $total = $this->passed + $this->failed;
        echo "\n=== Summary ===\n";
        echo "Passed: {$this->passed}/{$total}\n";
        echo "Failed: {$this->failed}/{$total}\n";

        if ($this->failed > 0) {
            echo "\nFailed tests:\n";
            foreach ($this->errors as $error) {
                echo "  - {$error}\n";
            }
            exit(1);
        }
        exit(0);
    }
}

// Run tests
$test = new ContainerTest();
$test->run();
