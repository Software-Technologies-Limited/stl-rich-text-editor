<?php

declare(strict_types=1);

namespace Stl\RichTextEditor;

use Stl\RichTextEditor\Support\Html;

final class Editor implements \Stringable
{
    /**
     * @param array<string, mixed> $options
     * @param array<string, scalar|null> $attributes
     */
    public function __construct(
        private readonly string $name,
        private readonly string $value = '',
        private readonly string $preset = 'standard',
        private readonly array $options = [],
        private readonly array $attributes = [],
        private readonly ?string $id = null,
    ) {
        if ($name === '') {
            throw new \InvalidArgumentException('Editor name is required.');
        }
        if (!in_array($preset, ['basic', 'standard', 'full', 'custom'], true)) {
            throw new \InvalidArgumentException('Editor preset must be basic, standard, full, or custom.');
        }
    }

    public function id(): string
    {
        if ($this->id !== null && $this->id !== '') {
            return $this->id;
        }

        $base = strtolower(trim((string) preg_replace('/[^A-Za-z0-9_-]+/', '-', $this->name), '-'));

        return ($base !== '' ? $base : 'stl') . '-editor';
    }

    public function render(): string
    {
        $id = $this->id();
        $attributes = array_merge($this->attributes, [
            'id' => $id,
            'name' => $this->name,
            'class' => trim(($this->attributes['class'] ?? '') . ' stl-rte-source'),
            'data-stl-rich-text-editor' => true,
        ]);

        return '<div class="stl-rte" data-stl-rte-root="' . Html::escape($id) . '">'
            . '<div class="stl-rte-toolbar" role="toolbar" aria-label="Rich text formatting"></div>'
            . '<div class="stl-rte-surface" contenteditable="true" role="textbox" aria-multiline="true"></div>'
            . '<textarea' . Html::attributes($attributes) . '>' . Html::escape($this->value) . '</textarea>'
            . '<div class="stl-rte-status" aria-live="polite"></div>'
            . '</div>';
    }

    public function script(): string
    {
        $options = array_merge(['preset' => $this->preset], $this->options);

        return '<script>(function(start){if(document.readyState==="loading")'
            . '{document.addEventListener("DOMContentLoaded",start,{once:true});}else{start();}})'
            . '(function(){if(window.StlRichTextEditor){window.StlRichTextEditor.create('
            . Html::json(['id' => $this->id()]) . '.id,' . Html::json($options) . ');}});</script>';
    }

    public function __toString(): string
    {
        return $this->render();
    }
}
