<?php

declare(strict_types=1);

namespace Stl\RichTextEditor\Bridge\Laravel;

use Illuminate\Support\ServiceProvider;

final class RichTextEditorServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../../../config/stl-rich-text-editor.php', 'stl-rich-text-editor');
    }

    public function boot(): void
    {
        $this->publishes([__DIR__ . '/../../../config/stl-rich-text-editor.php' => config_path('stl-rich-text-editor.php')], 'stl-rich-text-editor-config');
        $this->publishes([__DIR__ . '/../../assets' => public_path('vendor/stl-rich-text-editor')], 'stl-rich-text-editor-assets');
    }
}
