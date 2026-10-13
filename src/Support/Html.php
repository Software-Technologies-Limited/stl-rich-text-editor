<?php

declare(strict_types=1);

namespace Stl\RichTextEditor\Support;

use JsonException;

final class Html
{
    /** @param array<string, scalar|null> $attributes */
    public static function attributes(array $attributes): string
    {
        $html = '';
        foreach ($attributes as $name => $value) {
            if (!preg_match('/^[A-Za-z_:][A-Za-z0-9:._-]*$/', $name)) {
                throw new \InvalidArgumentException('Invalid HTML attribute name: ' . $name);
            }
            if ($value === null || $value === false) {
                continue;
            }
            $html .= ' ' . $name;
            if ($value !== true) {
                $html .= '="' . self::escape((string) $value) . '"';
            }
        }

        return $html;
    }

    public static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }

    /** @param array<string, mixed> $value */
    public static function json(array $value): string
    {
        try {
            return json_encode(
                $value,
                JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT,
            );
        } catch (JsonException $exception) {
            throw new \InvalidArgumentException('Editor options must be JSON-serializable.', 0, $exception);
        }
    }
}
