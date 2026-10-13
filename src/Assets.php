<?php

declare(strict_types=1);

namespace Stl\RichTextEditor;

use Stl\RichTextEditor\Support\Html;

final class Assets
{
    public function __construct(private readonly string $baseUrl = '/vendor/stl-rich-text-editor')
    {
    }

    public function styles(): string
    {
        return '<link rel="stylesheet" href="'
            . Html::escape(rtrim($this->baseUrl, '/') . '/stl-rich-text-editor.css') . '">';
    }

    public function scripts(): string
    {
        return '<script src="'
            . Html::escape(rtrim($this->baseUrl, '/') . '/stl-rich-text-editor.js') . '" defer></script>';
    }
}
