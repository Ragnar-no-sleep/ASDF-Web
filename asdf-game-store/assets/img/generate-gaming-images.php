<?php
/**
 * ASDF Store - Gaming Product Image Generator
 * Generates SVG placeholder images for gaming products
 */

$products = [
    'keyboard' => [
        'name' => 'Terminal Hacker Keyboard',
        'color' => '#00ff88',
        'icon' => '<rect x="40" y="80" width="120" height="80" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><line x1="60" y1="100" x2="140" y2="100" stroke="currentColor" stroke-width="2"/><line x1="60" y1="120" x2="140" y2="120" stroke="currentColor" stroke-width="2"/><line x1="60" y1="140" x2="140" y2="140" stroke="currentColor" stroke-width="2"/>'
    ],
    'gpu' => [
        'name' => 'Crypto Mining GPU RTX 4090',
        'color' => '#00e5ff',
        'icon' => '<rect x="30" y="70" width="140" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="3"/><rect x="50" y="90" width="30" height="40" fill="currentColor" opacity="0.3"/><rect x="90" y="90" width="30" height="40" fill="currentColor" opacity="0.3"/><rect x="130" y="90" width="30" height="40" fill="currentColor" opacity="0.3"/><circle cx="160" cy="75" r="8" fill="none" stroke="currentColor" stroke-width="2"/>'
    ],
    'console' => [
        'name' => 'Blockchain Console Elite',
        'color' => '#8338ec',
        'icon' => '<rect x="50" y="80" width="100" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="80" cy="110" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="120" cy="110" r="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="90" y="95" width="20" height="8" fill="currentColor"/>'
    ],
    'nft' => [
        'name' => 'ASDF NFT Game Bundle',
        'color' => '#ff006e',
        'icon' => '<path d="M 100 50 L 140 90 L 120 140 L 80 140 L 60 90 Z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="100" cy="90" r="15" fill="currentColor" opacity="0.5"/><text x="100" y="100" text-anchor="middle" fill="currentColor" font-size="24" font-weight="bold">NFT</text>'
    ],
    'mouse' => [
        'name' => 'Terminal Gaming Mouse',
        'color' => '#00ff88',
        'icon' => '<path d="M 70 80 Q 70 60, 100 60 Q 130 60, 130 80 L 130 140 Q 130 160, 100 160 Q 70 160, 70 140 Z" fill="none" stroke="currentColor" stroke-width="3"/><line x1="100" y1="60" x2="100" y2="100" stroke="currentColor" stroke-width="2"/><circle cx="100" cy="85" r="5" fill="currentColor"/>'
    ],
    'vr' => [
        'name' => 'VR Headset Metaverse Pro',
        'color' => '#ffa502',
        'icon' => '<ellipse cx="100" cy="110" rx="60" ry="30" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="75" cy="110" r="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="125" cy="110" r="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M 40 110 Q 30 110, 30 100" stroke="currentColor" stroke-width="3" fill="none"/><path d="M 160 110 Q 170 110, 170 100" stroke="currentColor" stroke-width="3" fill="none"/>'
    ],
    'chair' => [
        'name' => 'Gaming Chair HODL',
        'color' => '#ff4757',
        'icon' => '<rect x="60" y="70" width="80" height="60" rx="10" fill="none" stroke="currentColor" stroke-width="3"/><rect x="70" y="130" width="60" height="30" fill="currentColor" opacity="0.3"/><line x1="90" y1="70" x2="90" y2="50" stroke="currentColor" stroke-width="3"/><line x1="110" y1="70" x2="110" y2="50" stroke="currentColor" stroke-width="3"/>'
    ],
    'stream-deck' => [
        'name' => 'Stream Deck Terminal',
        'color' => '#00ff88',
        'icon' => '<rect x="50" y="80" width="100" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><rect x="65" y="95" width="20" height="15" fill="currentColor" opacity="0.5"/><rect x="90" y="95" width="20" height="15" fill="currentColor" opacity="0.5"/><rect x="115" y="95" width="20" height="15" fill="currentColor" opacity="0.5"/><rect x="65" y="115" width="20" height="15" fill="currentColor" opacity="0.5"/><rect x="90" y="115" width="20" height="15" fill="currentColor" opacity="0.5"/><rect x="115" y="115" width="20" height="15" fill="currentColor" opacity="0.5"/>'
    ]
];

function generateSVG($data) {
    $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">
    <defs>
        <linearGradient id="grad-{$data['name']}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:{$data['color']};stop-opacity:0.2" />
            <stop offset="100%" style="stop-color:{$data['color']};stop-opacity:0.05" />
        </linearGradient>
        <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>

    <!-- Background -->
    <rect width="200" height="200" fill="#0a0e14"/>
    <rect width="200" height="200" fill="url(#grad-{$data['name']})"/>

    <!-- Grid pattern -->
    <path d="M 0 0 L 200 0 L 200 200 L 0 200 Z M 10 10 L 190 10 L 190 190 L 10 190 Z"
          fill="none" stroke="{$data['color']}" stroke-width="0.5" opacity="0.1"/>

    <!-- Icon -->
    <g color="{$data['color']}" filter="url(#glow)">
        {$data['icon']}
    </g>

    <!-- Terminal scanline -->
    <rect width="200" height="2" y="0" fill="{$data['color']}" opacity="0.1">
        <animate attributeName="y" from="-2" to="200" dur="4s" repeatCount="indefinite"/>
    </rect>
</svg>
SVG;

    return $svg;
}

// Generate images
foreach ($products as $key => $data) {
    $svg = generateSVG($data);
    $filename = __DIR__ . "/categories/gaming-{$key}.svg";
    file_put_contents($filename, $svg);
    echo "✓ Generated: gaming-{$key}.svg\n";
}

echo "\n✅ All gaming images generated!\n";
